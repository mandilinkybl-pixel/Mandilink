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
    // mapping for dynamic model selection
    this.userModels = {
      LISTING: Listing,
      Company: Company
    };
  }

  // Helper: determine model name for a user object (if you have full user doc)
  getUserModelFromDoc(userDoc) {
    // Company documents have contactPerson field, LISTING does not (by your models)
    return userDoc && userDoc.contactPerson ? "Company" : "LISTING";
  }

  // Helper: get Mongoose model object by model name string
  getUserModelByName(modelName) {
    return this.userModels[modelName] || Listing;
  }

  // Helper: update user's current plan id, name and subscriptionExpiry
  async updateUserCurrentPlan(userId, userModelName, planDoc, expiryDate, session = null) {
    const UserModel = this.getUserModelByName(userModelName);

    const update = {
      currentPlan: planDoc ? planDoc._id : null,
      currentPlanName: planDoc ? planDoc.name || null : null,
      subscriptionExpiry: expiryDate || null
    };

    const options = {};
    if (session) options.session = session;

    await UserModel.findByIdAndUpdate(userId, update, options);
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
                 purchase.endDate && purchase.endDate > new Date(),
        daysRemaining: purchase.endDate && purchase.endDate > new Date()
          ? Math.ceil((new Date(purchase.endDate) - new Date()) / (1000 * 60 * 60 * 24))
          : 0
      }));

      res.json({
        success: true,
        purchases: enrichedPurchases,
        activePurchase: enrichedPurchases.find(p => p.isActive) || null,
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
      const userModelName = req.user.contactPerson ? "Company" : "LISTING";

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

          const UserModel = mongoose.model(userModelName);
          await UserModel.updateOne(
            { _id: userId },
            { razorpayCustomerId },
            { session }
          );

        } catch (err) {
          // Handle "already exists" safely by searching existing customers
          if (err?.error?.description?.includes("already exists") || (err?.error && /already exists/i.test(err.error.description || ""))) {
            const customers = await razorpay.customers.all({
              email: req.user.email,
              count: 1
            });

            if (!customers.items.length) {
              throw err;
            }

            razorpayCustomerId = customers.items[0].id;

            const UserModel = mongoose.model(userModelName);
            await UserModel.updateOne(
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
      const receipt = `ord_${Date.now().toString().slice(-8)}`; // < 40 chars

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
        userModel: userModelName,
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
  static async verifyUserPayment(req, res) {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature, purchaseId } = req.body;
      const userId = req.user._id;

      // Verify signature
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({
          success: false,
          error: "Invalid signature"
        });
      }

      const order = await razorpay.orders.fetch(razorpayOrderId);
      if (order.status !== "paid") {
        return res.status(400).json({
          success: false,
          error: "Payment failed"
        });
      }

      const purchase = await Purchase.findOne({
        _id: purchaseId,
        user: userId,
        razorpayOrderId
      });

      if (!purchase) {
        return res.status(404).json({
          success: false,
          error: "Purchase not found"
        });
      }

      // Activate purchase
      purchase.razorpayPaymentId = razorpayPaymentId;
      purchase.paymentStatus = "active";
      purchase.subscriptionStatus = "active";
      purchase.startDate = new Date();

      // Compute end date based on billingCycle
      const months = { monthly: 1, quarterly: 3, yearly: 12 }[purchase.billingCycle] || 1;
      const endDate = new Date(purchase.startDate);
      endDate.setMonth(endDate.getMonth() + months);
      purchase.endDate = endDate;

      await purchase.save();

      // Update user's currentPlan, currentPlanName and subscriptionExpiry on the appropriate model
      const planDoc = await Plan.findById(purchase.plan);
      const userModelName = purchase.userModel || (req.user.contactPerson ? "Company" : "LISTING");
      const controller = new PurchasePlanController();
      await controller.updateUserCurrentPlan(purchase.user, userModelName, planDoc, purchase.endDate);

      // Send confirmation email if email exists
      try {
        if (req.user && req.user.email) {
          await transporter.sendMail({
            to: req.user.email,
            subject: "Purchase Confirmed",
            html: `<h2>Purchase Confirmed!</h2><p>Your plan <strong>${planDoc ? planDoc.name : "Plan"}</strong> is activated and will expire on ${purchase.endDate.toDateString()}.</p>`
          });
        }
      } catch (emailErr) {
        // Log but don't fail the request
        console.error("Failed to send confirmation email:", emailErr);
      }

      res.json({
        success: true,
        message: "Payment verified successfully",
        purchaseId: purchase._id
      });

    } catch (error) {
      console.error("Verify payment error:", error);
      res.status(500).json({
        success: false,
        error: "Verification failed"
      });
    }
  }

  // Get active purchase for current user
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

  // Get payment methods for current user
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

  // Add payment method (stub — expand as needed)
  static async addPaymentMethod(req, res) {
    try {
      const { cardToken } = req.body;
      const userId = req.user._id;

      if (!cardToken) {
        return res.status(400).json({ success: false, error: "cardToken required" });
      }

      // Create payment method on Razorpay and store locally
      const user = req.user;
      const razorpayCustomerId = user.razorpayCustomerId;
      if (!razorpayCustomerId) {
        return res.status(400).json({ success: false, error: "Razorpay customer id not found. Create an order first." });
      }

      const pmResponse = await razorpay.paymentMethods.create({
        type: "card",
        card: { token: cardToken }
      });

      const paymentMethodDoc = new PaymentMethod({
        user: userId,
        razorpayCustomerId,
        razorpayPaymentMethodId: pmResponse.id,
        cardId: pmResponse.card.id,
        last4: pmResponse.card.last4,
        network: pmResponse.card.network,
        type: pmResponse.card.type
      });

      await paymentMethodDoc.save();

      res.json({ success: true, message: "Payment method added", method: paymentMethodDoc });
    } catch (error) {
      console.error("Add payment method error:", error);
      res.status(500).json({ success: false, error: "Failed to add" });
    }
  }

  // Cancel purchase (assumes req.purchase is injected by middleware or purchaseId provided)
  static async cancelPurchase(req, res) {
    try {
      const purchase = req.purchase || await Purchase.findById(req.body.purchaseId);
      if (!purchase) {
        return res.status(404).json({ success: false, error: "Purchase not found" });
      }

      purchase.subscriptionStatus = "cancelled";
      // if you track autoRenew on purchase, set it there. For now clear subscription fields on purchase
      purchase.autoRenew = false;
      await purchase.save();

      // Clear user's currentPlan only if the cancelled purchase was the active one
      const userModelName = purchase.userModel || (req.user && req.user.contactPerson ? "Company" : "LISTING");
      const activePurchase = await Purchase.findOne({
        user: purchase.user,
        subscriptionStatus: "active",
        endDate: { $gt: new Date() }
      });

      if (!activePurchase) {
        // No other active purchase, clear user's current plan
        const controller = new PurchasePlanController();
        await controller.updateUserCurrentPlan(purchase.user, userModelName, null, null);
      }

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