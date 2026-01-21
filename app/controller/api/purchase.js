const mongoose = require("mongoose");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { razorpay } = require("../../config/razorpay");
const Purchase = require("../../models/purchase");
const PaymentMethod = require("../../models/PaymentMethod");
const Plan = require("../../models/plan");
const Listing = require("../../models/lisingSchema");
const Company = require("../../models/companylisting");
const logger = require("../../utills/logger");


const rateLimit = require('express-rate-limit');
const purchaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  // If you meant to use a custom generator, define it:
  keyGenerator: (req, res) => {
    return req.ip; // Standard IP-based limiting
  },
  // OR if you were using a variable named ipKeyGenerator, ensure it exists above this line
});
// Create email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === "production"
  }
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter error:", error);
  } else {
    console.log("Email transporter ready");
  }
});

class PurchasePlanController {
  constructor() {
    this.transporter = transporter;
    this.userModels = {
      "LISTING": Listing,
      "Company": Company
    };
  }

  getUserModelFromDoc(userDoc) {
    return userDoc.contactPerson ? "Company" : "LISTING";
  }

  getUserDocument(userId, userDoc = null) {
    if (!userDoc) {
      // If userDoc not provided, fetch from appropriate model
      const user = this.userModels["LISTING"].findById(userId);
      if (!user) {
        user = this.userModels["Company"].findById(userId);
      }
      userDoc = user;
    }

    return {
      ...userDoc.toObject(),
      getDisplayName: () => userDoc.name || userDoc.contactPerson || "User",
      getContactEmail: () => userDoc.email || "no-reply@fallback.com",
      getContactNumber: () => userDoc.contactNumber || ""
    };
  }

  // Get user purchases
  static async getUserPurchases(req, res) {
    try {
      const userId = req.user._id;
      
      const purchases = await Purchase.find({ user: userId })
        .populate("plan", "name price")
        .sort({ createdAt: -1 });

      const enrichedPurchases = purchases.map(purchase => ({
        ...purchase.toObject(),
        isActive: purchase.subscriptionStatus === "active" && 
                 purchase.endDate > new Date(),
        daysRemaining: purchase.endDate && purchase.endDate > new Date() 
          ? Math.ceil((new Date(purchase.endDate) - new Date()) / (1000 * 60 * 60 * 24))
          : 0
      }));

      res.json({
        success: true,
        purchases: enrichedPurchases,
        activePurchase: enrichedPurchases.find(p => p.isActive),
        total: purchases.length
      });
    } catch (error) {
      console.error("Get purchases error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch purchases" 
      });
    }
  }

  // Create order
static async createUserOrder(req, res) {
  let session;

  try {
    const {
      planId,
      billingCycle = "monthly",
      paymentType = "upi", // "upi" | "card"
      cardToken,
      paymentMethodId,
      useExistingCard
    } = req.body;

    const userId = req.user._id;
    const userModel = req.user.contactPerson ? "Company" : "LISTING";

    session = await mongoose.startSession();
    session.startTransaction();

    /* ---------------- PLAN VALIDATION ---------------- */
    const plan = await Plan.findOne({ _id: planId, isActive: true }).session(session);
    if (!plan) {
      throw new Error("Invalid plan");
    }

    /* ---------------- RAZORPAY CUSTOMER ---------------- */
   let razorpayCustomerId = req.user.razorpayCustomerId;

if (!razorpayCustomerId) {
  try {
    const customer = await razorpay.customers.create({
      name: req.user.name || req.user.contactPerson || "User",
      email: req.user.email,
      contact: req.user.contactNumber
    });

    razorpayCustomerId = customer.id;

    await mongoose.model(userModel).updateOne(
      { _id: userId },
      { razorpayCustomerId },
      { session }
    );

  } catch (err) {
    // 👇 HANDLE "already exists" SAFELY
    if (err?.error?.description?.includes("already exists")) {
      const customers = await razorpay.customers.all({
        email: req.user.email,
        count: 1
      });

      if (!customers.items.length) {
        throw err;
      }

      razorpayCustomerId = customers.items[0].id;

      await mongoose.model(userModel).updateOne(
        { _id: userId },
        { razorpayCustomerId },
        { session }
      );
    } else {
      throw err;
    }
  }
}


    /* ---------------- PAYMENT METHOD (CARD ONLY) ---------------- */
    let paymentMethodDoc = null;

    if (paymentType === "card") {
      if (useExistingCard && paymentMethodId) {
        paymentMethodDoc = await PaymentMethod.findOne({
          _id: paymentMethodId,
          user: userId
        }).session(session);
      } else if (cardToken) {
        const pmResponse = await razorpay.paymentMethods.create({
          type: "card",
          card: { token: cardToken }
        });

        paymentMethodDoc = new PaymentMethod({
          user: userId,
          razorpayCustomerId,
          razorpayPaymentMethodId: pmResponse.id,
          cardId: pmResponse.card.id,
          last4: pmResponse.card.last4,
          network: pmResponse.card.network,
          type: pmResponse.card.type
        });

        await paymentMethodDoc.save({ session });
      }

      if (!paymentMethodDoc) {
        throw new Error("Card payment method required");
      }
    }

    /* ---------------- CREATE RAZORPAY ORDER ---------------- */
    const receipt = `ord_${Date.now().toString().slice(-8)}`; // ✅ < 40 chars

    const order = await razorpay.orders.create({
      amount: Math.round(plan.price * 100),
      currency: "INR",
      receipt,
      notes: {
        userId: userId.toString(),
        planId: planId,
        paymentType
      },
      payment_capture: 1
    });

    /* ---------------- CREATE PURCHASE ---------------- */
    const purchase = new Purchase({
      user: userId,
      userModel,
      plan: planId,
      billingCycle,
      paymentType,
      razorpayCustomerId,
      razorpayPaymentMethodId: paymentMethodDoc
        ? paymentMethodDoc.razorpayPaymentMethodId
        : null,
      razorpayOrderId: order.id,
      amount: plan.price,
      paymentStatus: "pending",
      subscriptionStatus: "pending"
    });

    await purchase.save({ session });
    await session.commitTransaction();

    /* ---------------- RESPONSE ---------------- */
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount / 100,
      purchaseId: purchase._id,
      razorpayKey: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    if (session) await session.abortTransaction();

    console.error("Create order error:", error);

    res.status(400).json({
      success: false,
      error: error.message || "Failed to create order"
    });
  } finally {
    if (session) session.endSession();
  }
}



  // Verify payment
  // static async verifyUserPayment(req, res) {
  //   try {
  //     const { razorpayOrderId, razorpayPaymentId, razorpaySignature, purchaseId } = req.body;
  //     const userId = req.user._id;

  //     // Verify signature
  //     const expectedSignature = crypto
  //       .createHmac("sha256", process.env.RAZOPAY_KEY_SECRET)
  //       .update(`${razorpayOrderId}|${razorpayPaymentId}`)
  //       .digest("hex");

  //     if (expectedSignature !== razorpaySignature) {
  //       return res.status(400).json({ 
  //         success: false, 
  //         error: "Invalid signature" 
  //       });
  //     }

  //     const order = await razorpay.orders.fetch(razorpayOrderId);
  //     if (order.status !== "paid") {
  //       return res.status(400).json({ 
  //         success: false, 
  //         error: "Payment failed" 
  //       });
  //     }

  //     const purchase = await Purchase.findOne({
  //       _id: purchaseId,
  //       user: userId,
  //       razorpayOrderId
  //     });

  //     if (!purchase) {
  //       return res.status(404).json({ 
  //         success: false, 
  //         error: "Purchase not found" 
  //       });
  //     }

  //     // Activate purchase
  //     purchase.razorpayPaymentId = razorpayPaymentId;
  //     purchase.paymentStatus = "active";
  //     purchase.subscriptionStatus = "active";
  //     purchase.startDate = new Date();

  //     // Set end date
  //     const months = { monthly: 1, quarterly: 3, yearly: 12 }[purchase.billingCycle] || 1;
  //     purchase.endDate = new Date(purchase.startDate);
  //     purchase.endDate.setMonth(purchase.endDate.getMonth() + months);

  //     await purchase.save();

  //     // Send confirmation email
  //     await transporter.sendMail({
  //       to: req.user.email,
  //       subject: "Purchase Confirmed",
  //       html: `<h2>Purchase Confirmed!</h2><p>Plan activated successfully.</p>`
  //     });

  //     res.json({
  //       success: true,
  //       message: "Payment verified successfully",
  //       purchaseId: purchase._id
  //     });

  //   } catch (error) {
  //     console.error("Verify payment error:", error);
  //     res.status(500).json({ 
  //       success: false, 
  //       error: "Verification failed" 
  //     });
  //   }
  // }

  // Inside your PurchasePlanController class

static async verifyUserPayment(req, res) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, purchaseId } = req.body;
    const userId = req.user._id;

    // 1. Signature Verification
    // Note: Ensure the secret key variable name matches your .env (RAZORPAY_KEY_SECRET)
    const secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZOPAY_KEY_SECRET;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

    // 2. Fetch Purchase and Populate Plan details
    const purchase = await Purchase.findOne({
      _id: purchaseId,
      user: userId,
      razorpayOrderId
    }).populate("plan");

    if (!purchase) {
      return res.status(404).json({ success: false, error: "Purchase record not found" });
    }

    // 3. Update Purchase Record
    purchase.razorpayPaymentId = razorpayPaymentId;
    purchase.paymentStatus = "active";
    purchase.subscriptionStatus = "active";
    purchase.startDate = new Date();

    // Calculate Expiry Date based on billing cycle
    const months = { monthly: 1, quarterly: 3, yearly: 12 }[purchase.billingCycle] || 1;
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + months);
    purchase.endDate = expiryDate;

    await purchase.save();

    /* ---------------- UPDATING USER MODEL (LISTING OR COMPANY) ---------------- */
    
    // purchase.userModel contains either "LISTING" or "Company"
    const UserCollection = mongoose.model(purchase.userModel);

    const updateData = {
      currentPlan: purchase.plan._id,      // Updates the ref ID
      currentPlanName: purchase.plan.name, // Updates the Plan Name string
      subscriptionExpiry: expiryDate,     // Updates the Expiry Date
      isVerified: true                    // Optional: mark verified after payment
    };

    const updatedUser = await UserCollection.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    /* -------------------------------------------------------------------------- */

    // 4. Send Confirmation Email
    if (updatedUser && updatedUser.email) {
      await transporter.sendMail({
        to: updatedUser.email,
        subject: `Plan Activated: ${purchase.plan.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #2e7d32;">Payment Successful!</h2>
            <p>Hello <b>${updatedUser.name}</b>,</p>
            <p>Your subscription to the <b>${purchase.plan.name}</b> has been activated.</p>
            <hr />
            <p><b>Order ID:</b> ${razorpayOrderId}</p>
            <p><b>Plan Valid Until:</b> ${expiryDate.toDateString()}</p>
            <p>Thank you for choosing our Mandi service!</p>
          </div>
        `
      });
    }

    return res.json({
      success: true,
      message: "Payment verified. Profile updated successfully.",
      data: {
        plan: purchase.plan.name,
        expiry: expiryDate
      }
    });

  } catch (error) {
    console.error("Verification Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Internal server error during verification" 
    });
  }
}

  // Additional methods
  static async getActivePurchase(req, res) {
    try {
      const userId = req.user._id;
      const purchase = await Purchase.findOne({
        user: userId,
        subscriptionStatus: "active",
        endDate: { $gt: new Date() }
      }).populate("plan");

      res.json({
        success: true,
        purchase: purchase || null
      });
    } catch (error) {
      console.error("Get active purchase error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch" });
    }
  }

  static async getPaymentMethods(req, res) {
    try {
      const userId = req.user._id;
      const methods = await PaymentMethod.find({ user: userId });
      res.json({ success: true, methods });
    } catch (error) {
      console.error("Get payment methods error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch" });
    }
  }

  static async addPaymentMethod(req, res) {
    try {
      // Implementation for adding payment method
      res.json({ success: true, message: "Payment method added" });
    } catch (error) {
      console.error("Add payment method error:", error);
      res.status(500).json({ success: false, error: "Failed to add" });
    }
  }

  static async cancelPurchase(req, res) {
    try {
      const purchase = req.purchase;
      purchase.subscriptionStatus = "cancelled";
      purchase.autoRenew = false;
      await purchase.save();

      res.json({
        success: true,
        message: "Purchase cancelled successfully"
      });
    } catch (error) {
      console.error("Cancel purchase error:", error);
      res.status(500).json({ success: false, error: "Failed to cancel" });
    }
  }
}

module.exports = PurchasePlanController;
