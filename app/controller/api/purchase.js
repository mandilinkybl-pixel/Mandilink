const Razorpay = require("razorpay");
const crypto = require("crypto");
const PurchasePlan = require("../../models/purchase");
const Plan = require("../../models/plan");
const ListingUser = require("../../models/lisingSchema");
const Company = require("../../models/companylisting");
const SecureEmployee = require("../../models/adminEmployee");

const razorpay = new Razorpay({
  key_id: process.env.RAZOPAYKEY_ID,
  key_secret: process.env.RAZOPAYKEY_SECRET,
});

class PurchasePlanController {
  // ✅ User: Get purchase history
  async getUserPurchases(req, res) {
    try {
      const { userId, userModel } = req.query; // userId & model type must be sent
      if (!userId || !userModel) {
        return res.status(400).json({ success: false, message: "userId and userModel are required" });
      }

      const purchases = await PurchasePlan.find({ user: userId, userModel })
        .populate("plan", "name price duration")
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        count: purchases.length,
        data: purchases,
      });
    } catch (err) {
      console.error("User purchases error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // ✅ User: Buy a plan (create Razorpay order)
  async createUserOrder(req, res) {
    try {
      const { planId, userId, userModel } = req.body;

      if (!planId || !userId || !userModel) {
        return res.status(400).json({ error: "planId, userId and userModel are required" });
      }

      const plan = await Plan.findById(planId);
      if (!plan) return res.status(400).json({ error: "Invalid plan" });

      let user;
      if (userModel === "LISTING") user = await ListingUser.findById(userId);
      else if (userModel === "Company") user = await Company.findById(userId);
      else if (userModel === "SecureEmployee") user = await SecureEmployee.findById(userId);

      if (!user) return res.status(400).json({ error: "Invalid user" });

      const options = {
        amount: Number(plan.price) * 100, // Razorpay requires paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);

      const purchase = await PurchasePlan.create({
        user: user._id,
        userModel,
        plan: plan._id,
        razorpayOrderId: order.id,
        amount: plan.price,
        currency: "INR",
        paymentStatus: "created",
        status: "active",
        startDate: new Date(),
      });

      return res.json({
        success: true,
        orderId: order.id,
        key: process.env.RAZOPAYKEY_ID,
        amount: Number(plan.price) * 100,
        currency: "INR",
        purchaseId: purchase._id,
      });
    } catch (err) {
      console.error("Create order error:", err);
      return res.status(500).json({ error: "Failed to create Razorpay order" });
    }
  }

  // ✅ User: Verify payment
  async verifyUserPayment(req, res) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, purchaseId } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !purchaseId) {
        return res.status(400).json({ error: "All payment fields are required" });
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZOPAYKEY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: "Payment verification failed" });
      }

      const purchase = await PurchasePlan.findByIdAndUpdate(
        purchaseId,
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paymentStatus: "success",
          status: "active",
        },
        { new: true }
      ).populate("plan", "name price duration");

      return res.json({ success: true, purchase });
    } catch (err) {
      console.error("Payment verification error:", err);
      return res.status(500).json({ error: "Payment verification failed" });
    }
  }
}

module.exports = new PurchasePlanController();
