const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PurchasePlanSchema = new Schema(
  {
    // Can be a normal user, company, or secure employee
    user: { type: mongoose.Schema.Types.ObjectId, refPath: "userModel" },
    userModel: { type: String, enum: ["LISTING", "Company", "SecureEmployee"], required: true },

    // Optional: specific secure employee who made the purchase (for admin/test purposes)
    secureEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee" },

    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },

    // Razorpay payment details
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    paymentStatus: {
      type: String,
      enum: ["created", "pending", "success", "failed"],
      default: "created",
    },

    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },

    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Auto-calculate endDate based on plan duration
PurchasePlanSchema.pre("save", async function (next) {
  if (this.isNew && this.plan && !this.endDate) {
    const Plan = mongoose.model("Plan");
    const plan = await Plan.findById(this.plan);
    if (plan && plan.duration) {
      this.endDate = new Date(
        this.startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000
      );
    }
  }
  next();
});

module.exports = mongoose.model("PurchasePlan", PurchasePlanSchema);
