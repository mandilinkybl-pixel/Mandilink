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
  // List all purchases
  async allPurchases(req, res) {
    try {
      const { q, startDate, endDate } = req.query;
      const filter = {};

      if (q) {
  const amountQuery = Number(q);
  filter.$or = [
    !isNaN(amountQuery) ? { amount: amountQuery } : null, // exact number match if q is number
    { status: { $regex: q, $options: "i" } }
  ].filter(Boolean); // remove nulls
}


      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) {
          const d = new Date(endDate);
          d.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = d;
        }
      }

      const purchases = await PurchasePlan.find(filter)
        .populate("secureEmployee", "name email contactNumber")
        .populate("user", "name email contactNumber")
        .populate("plan", "name price duration")
        .sort({ createdAt: -1 });

      const plans = await Plan.find();
      const userdetails = await SecureEmployee.findById(req.user.id);

      res.render("admin/allPurchases", {
        purchases,
        user:req.user,
        plans,
        userdetails,
        q: q || "",
        startDate: startDate || "",
        endDate: endDate || "",
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }

  // Create Razorpay order
  async createRazorpayOrder(req, res) {
    try {
      const { planId, userId, userModel } = req.body;

      const plan = await Plan.findById(planId);
      if (!plan) return res.status(400).json({ error: "Invalid plan" });

      let user;
      if (userModel === "LISTING") user = await ListingUser.findById(userId);
      else if (userModel === "Company") user = await Company.findById(userId);
      else if (userModel === "SecureEmployee") user = await SecureEmployee.findById(userId);

      if (!user) return res.status(400).json({ error: "Invalid user" });

      const options = {
        amount: Number(plan.price) * 100,
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
        paymentStatus: "pending",
        status: "active",
        startDate: new Date(),
      });

      res.json({
        success: true,
        orderId: order.id,
        key: process.env.RAZOPAYKEY_ID,
        amount: Number(plan.price) * 100,
        currency: "INR",
        purchaseId: purchase._id,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create Razorpay order" });
    }
  }

  // Verify Razorpay payment
  async verifyRazorpayPayment(req, res) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, purchaseId } = req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZOPAYKEY_SECRET)
        .update(body)
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
      );

      res.json({ success: true, purchase });
    } catch (err) {
      console.error("Payment verification error:", err);
      res.status(500).json({ error: "Payment verification failed" });
    }
  }
  // Show failed or pending purchases
async failedPurchases(req, res) {
  try {
    const { q, startDate, endDate } = req.query;
    const filter = { paymentStatus: { $ne: "success" } }; // failed or pending

    if (q) {
  const amountQuery = Number(q);
  filter.$or = [
    !isNaN(amountQuery) ? { amount: amountQuery } : null, // exact number match if q is number
    { status: { $regex: q, $options: "i" } }
  ].filter(Boolean); // remove nulls
}


    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    const purchases = await PurchasePlan.find(filter)
      .populate("secureEmployee", "name email contactNumber")
      .populate("user", "name email contactNumber")
      .populate("plan", "name price duration")
      .sort({ createdAt: -1 });

    const plans = await Plan.find();
    const userdetails = await SecureEmployee.findById(req.user.id);

    res.render("admin/failedPurchases", {
      purchases,
      plans,
      userdetails,
      q: q || "",
      startDate: startDate || "",
      endDate: endDate || "",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
}

}

module.exports = new PurchasePlanController();
