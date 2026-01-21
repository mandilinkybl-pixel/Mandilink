const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/userauth"); // Your auth middleware
const PurchasePlanController = require("../../controller/api/purchase");
const { body, validationResult } = require("express-validator");
// const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const logger = require("../../utills/logger");

// Rate limiting
const rateLimit = require('express-rate-limit');

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  // FIX: Explicitly define the key generator function here
  keyGenerator: (req, res) => {
    return req.ip; 
  },
  message: { success: false, error: "Too many requests, please try again later." }
});

// Order limiter
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, error: "Too many order attempts" },
  keyGenerator: (req) => `${req.user?._id || "anonymous"}-${ipKeyGenerator(req)}`, // ✅ Optional but recommended for consistency
});
// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array()
    });
  }
  next();
};

// Ownership validation middleware
const validatePurchaseOwnership = async (req, res, next) => {
  try {
    const { purchaseId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid purchase ID" 
      });
    }

    const Purchase = require("../../models/purchase");
    const purchase = await Purchase.findOne({
      _id: purchaseId,
      user: req.user._id
    });

    if (!purchase) {
      return res.status(404).json({ 
        success: false, 
        error: "Purchase not found or access denied" 
      });
    }

    req.purchase = purchase;
    next();
  } catch (error) {
    logger.error("Purchase ownership validation failed", { 
      purchaseId: req.params.purchaseId,
      userId: req.user?._id,
      error: error.message 
    });
    res.status(500).json({ 
      success: false, 
      error: "Failed to validate purchase access" 
    });
  }
};

// Apply auth middleware to all routes
router.use(authMiddleware);

// ===== GET PURCHASE HISTORY =====
router.get("/history", async (req, res) => {
  try {
    await PurchasePlanController.getUserPurchases(req, res);
  } catch (error) {
    console.error("Get purchases error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch purchase history" 
    });
  }
});

// ===== CREATE ORDER =====
router.post(
  "/create-order",
  orderLimiter,
  paymentLimiter,
  [
    body("planId").isMongoId().withMessage("Valid plan ID required"),
    body("billingCycle")
      .optional()
      .isIn(["monthly", "quarterly", "yearly"])
      .withMessage("Invalid billing cycle"),
    body("cardToken")
      .optional()
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Invalid card token"),
    body("paymentMethodId")
      .optional()
      .isMongoId()
      .withMessage("Invalid payment method ID"),
    body("useExistingCard")
      .optional()
      .isBoolean()
      .withMessage("useExistingCard must be boolean")
  ],
  validateRequest,
  async (req, res) => {
    try {
      // Add user info from auth middleware
      req.body.userId = req.user._id.toString();
      req.body.userModel = req.user.contactPerson ? "Company" : "LISTING";
      
      await PurchasePlanController.createUserOrder(req, res);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to create order" 
      });
    }
  }
);

// ===== VERIFY PAYMENT =====
router.post(
  "/verify-payment",
  paymentLimiter,
  [
    body("razorpayOrderId").notEmpty().withMessage("Order ID required"),
    body("razorpayPaymentId").notEmpty().withMessage("Payment ID required"),
    body("razorpaySignature").notEmpty().withMessage("Signature required"),
    body("purchaseId").isMongoId().withMessage("Valid purchase ID required")
  ],
  validateRequest,
  async (req, res) => {
    try {
      req.body.userId = req.user._id.toString();
      await PurchasePlanController.verifyUserPayment(req, res);
    } catch (error) {
      console.error("Verify payment error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Payment verification failed" 
      });
    }
  }
);

// ===== GET ACTIVE PURCHASE =====
router.get("/active", async (req, res) => {
  try {
    await PurchasePlanController.getActivePurchase(req, res);
  } catch (error) {
    console.error("Get active purchase error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch active purchase" 
    });
  }
});

// ===== PAYMENT METHODS =====
router.get("/payment-methods", async (req, res) => {
  try {
    await PurchasePlanController.getPaymentMethods(req, res);
  } catch (error) {
    console.error("Get payment methods error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch payment methods" 
    });
  }
});

router.post(
  "/payment-methods",
  paymentLimiter,
  [
    body("cardToken").notEmpty().matches(/^[a-zA-Z0-9_-]+$/).withMessage("Valid card token required"),
    body("setAsDefault").optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      req.body.userId = req.user._id.toString();
      req.body.userModel = req.user.contactPerson ? "Company" : "LISTING";
      await PurchasePlanController.addPaymentMethod(req, res);
    } catch (error) {
      console.error("Add payment method error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to add payment method" 
      });
    }
  }
);

// ===== MANAGE PURCHASES =====
router.post(
  "/:purchaseId/cancel",
  validatePurchaseOwnership,
  [
    body("reason").optional().isLength({ max: 500 }).withMessage("Reason too long")
  ],
  validateRequest,
  async (req, res) => {
    try {
      req.body.userId = req.user._id.toString();
      req.purchase = req.purchase; // Already validated
      await PurchasePlanController.cancelPurchase(req, res);
    } catch (error) {
      console.error("Cancel purchase error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to cancel purchase" 
      });
    }
  }
);

// ===== WEBHOOK (Public - No auth required) =====
router.post("/webhook/razorpay", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const eventData = req.body;

    if (!signature) {
      return res.status(400).json({ error: "Missing signature" });
    }

    // Verify webhook signature
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZOPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(eventData))
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Process webhook events
    console.log("Webhook received:", eventData.event);
    
    // Handle subscription events, payment captures, etc.
    // Implementation depends on your webhook processing logic

    res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ===== HEALTH CHECK =====
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    user: req.user ? {
      id: req.user._id,
      model: req.user.contactPerson ? "Company" : "LISTING"
    } : null,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error("Route error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error"
  });
});

module.exports = router;
