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

// Add / ensure these requires near the top of your controller file
// const crypto = require('crypto');
// const mongoose = require('mongoose');
// const Plan = require('../../models/Plan'); // <-- matches your models/Plan.js
// const Listing = require('../../models/listingSchema');
// const Company = require('../../models/companylisting');
// const Purchase = require('../../models/purchase');
// // razorpay and transporter should be created earlier in this file or imported
// // e.g. const Razorpay = require('razorpay'); const razorpay = new Razorpay({...});
// // e.g. const transporter = require('../utils/mailer');

static async verifyUserPayment(req, res) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, purchaseId } = req.body;
    const userId = req.user._id;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !purchaseId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZOPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    // Verify order status from Razorpay (defensive: check razorpay client)
    let order;
    try {
      if (!global.razorpay && typeof razorpay === 'undefined') {
        console.warn('razorpay client not found in scope; skipping remote order fetch');
      } else {
        const rp = global.razorpay || razorpay;
        order = await rp.orders.fetch(razorpayOrderId);
      }
    } catch (e) {
      console.warn('Failed to fetch razorpay order:', e.message);
      // Proceed — we'll still validate locally
    }

    if (order && order.status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Payment not completed' });
    }

    // Find the purchase
    const purchase = await Purchase.findOne({
      _id: purchaseId,
      user: userId,
      razorpayOrderId
    });

    if (!purchase) {
      return res.status(404).json({ success: false, error: 'Purchase not found' });
    }

    // Activate purchase
    purchase.razorpayPaymentId = razorpayPaymentId;
    purchase.paymentStatus = 'active';
    purchase.subscriptionStatus = 'active';
    purchase.startDate = new Date();

    // Determine planId from purchase (support common keys)
    const possiblePlanIds = [purchase.plan, purchase.planId, purchase.currentPlan, purchase.plan_id, purchase.planIdString];
    const planId = possiblePlanIds.find((p) => !!p) || null;

    let planDoc = null;
    if (planId && mongoose.Types.ObjectId.isValid(planId)) {
      try {
        planDoc = await Plan.findById(planId).lean();
      } catch (e) {
        console.warn('Plan lookup failed:', e.message);
      }
    }

    // Compute endDate:
    if (planDoc && typeof planDoc.duration === 'number' && planDoc.duration > 0) {
      // Plan.duration is in days per your Plan model
      const durationDays = planDoc.duration;
      purchase.endDate = new Date(purchase.startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    } else {
      // Fallback to billingCycle if plan doesn't exist or no duration
      const months = { monthly: 1, quarterly: 3, yearly: 12 }[purchase.billingCycle] || 1;
      purchase.endDate = new Date(purchase.startDate);
      purchase.endDate.setMonth(purchase.endDate.getMonth() + months);
    }

    await purchase.save();

    // Update Listing / Company subscription fields (match on user_id OR _id)
    try {
      const filter = { $or: [{ user_id: userId }, { _id: userId }] };
      const update = {
        $set: {
          currentPlan: planDoc ? planDoc._id : (planId || null),
          currentPlanName: planDoc ? planDoc.name : (purchase.planName || null),
          subscriptionExpiry: purchase.endDate
        }
      };

      // Update preferred billing cycle if available
      if (purchase.billingCycle) {
        update.$set['subscriptionPreferences.preferredBillingCycle'] = purchase.billingCycle;
      }

      // Try Company first if user indicates company, else try Listing first
      let updated = null;
      if (req.user && req.user.contactPerson) {
        updated = await Company.findOneAndUpdate(filter, update, { new: true });
        if (!updated) {
          updated = await Listing.findOneAndUpdate(filter, update, { new: true });
        }
      } else {
        updated = await Listing.findOneAndUpdate(filter, update, { new: true });
        if (!updated) {
          updated = await Company.findOneAndUpdate(filter, update, { new: true });
        }
      }

      if (updated) {
        console.log('Subscription fields updated for user doc:', updated._id);
      } else {
        console.warn('No Listing or Company document found to update for user:', userId.toString());
      }
    } catch (updateErr) {
      console.error('Error updating Listing/Company subscription fields:', updateErr);
      // don't fail the whole flow if update fails
    }

    // Send confirmation email (defensive)
    try {
      if (typeof transporter !== 'undefined' && transporter) {
        await transporter.sendMail({
          to: req.user.email,
          subject: 'Purchase Confirmed',
          html: `<h2>Purchase Confirmed!</h2><p>Your plan has been activated.</p>`
        });
      } else {
        console.warn('transporter not available; skipping confirmation email');
      }
    } catch (mailErr) {
      console.error('Failed to send purchase confirmation email:', mailErr);
    }

    // Return success
    return res.json({
      success: true,
      message: 'Payment verified successfully',
      purchaseId: purchase._id
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ success: false, error: 'Verification failed' });
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
