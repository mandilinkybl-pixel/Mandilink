// models/Subscription.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SubscriptionSchema = new Schema(
  {
    // Polymorphic user reference for Company and LISTING
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
      index: true 
    },
    userModel: { 
      type: String, 
      enum: ["LISTING", "Company", "SecureEmployee"], 
      required: true,
      index: true 
    },

    // Optional: SecureEmployee who manages this subscription (admin)
    secureEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee" },

    // Plan reference
    plan: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Plan", 
      required: true,
      index: true 
    },

    // Billing configuration
    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: "monthly"
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },

    // Razorpay integration
    razorpayCustomerId: { type: String, required: true, index: true },
    razorpaySubscriptionId: { type: String },
    razorpayPaymentMethodId: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    // Card information (masked)
    cardLast4: { type: String },
    cardNetwork: { type: String },
    cardType: { type: String },
    cardExpiryMonth: { type: Number },
    cardExpiryYear: { type: Number },

    // Subscription lifecycle
    paymentStatus: {
      type: String,
      enum: ["created", "pending", "active", "paused", "cancelled", "failed"],
      default: "created"
    },
    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "paused", "cancelled", "expired", "failed"],
      default: "created"
    },
    autoRenew: { type: Boolean, default: true },
    
    // Dates
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    nextBillingDate: { type: Date },
    trialEndDate: { type: Date },
    cancelledAt: { type: Date },
    lastRenewedAt: { type: Date },
    lastRenewalAttempt: { type: Date },

    // Usage tracking (resets on billing cycle)
    usage: {
      chatbotCreditsUsed: { type: Number, default: 0 },
      messagesSent: { type: Number, default: 0 },
      adsPosted: { type: Number, default: 0 },
      jobPosts: { type: Number, default: 0 },
      bidsPlaced: { type: Number, default: 0 }
    },

    // Renewal failure handling
    renewalAttempts: { type: Number, default: 0 },
    maxRenewalAttempts: { type: Number, default: 3 },

    // Metadata
    metadata: {
      originalAmount: { type: Number },
      discountApplied: { type: Number, default: 0 },
      couponCode: { type: String },
      trialUsed: { type: Boolean, default: false },
      createdVia: { type: String, enum: ["web", "mobile", "admin"], default: "web" },
      userType: { type: String }, // "business" or "individual"
      ipAddress: { type: String },
      userAgent: { type: String }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
// Composite indexes for performance
SubscriptionSchema.index({ user: 1, userModel: 1 });
SubscriptionSchema.index({ razorpaySubscriptionId: 1 });
SubscriptionSchema.index({ nextBillingDate: 1 });
SubscriptionSchema.index({ subscriptionStatus: 1 });
SubscriptionSchema.index({ autoRenew: 1, subscriptionStatus: 1 });
SubscriptionSchema.index({ user: 1, subscriptionStatus: 1 });
SubscriptionSchema.index({ endDate: 1 });

// Pre-save hook to calculate dates and validate
SubscriptionSchema.pre("save", async function (next) {
  if (this.isNew && this.plan && !this.endDate) {
    try {
      const Plan = mongoose.model("Plan");
      const plan = await Plan.findById(this.plan);
      
      if (plan && plan.duration) {
        const cycleMultiplier = {
          monthly: 1,
          quarterly: 3,
          yearly: 12
        }[this.billingCycle] || 1;
        
        const cycleDuration = plan.duration * cycleMultiplier;
        this.endDate = new Date(this.startDate.getTime() + cycleDuration * 24 * 60 * 60 * 1000);
        this.nextBillingDate = this.endDate;
        this.amount = plan.price || this.amount;
        this.metadata.originalAmount = plan.price;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Instance methods
SubscriptionSchema.methods = {
  // Check if subscription is active
  isActive() {
    const now = new Date();
    return this.subscriptionStatus === "active" && 
           now <= (this.endDate || this.trialEndDate || now);
  },

  // Check if in trial
  isTrial() {
    const now = new Date();
    return this.subscriptionStatus === "trial" && now <= this.trialEndDate;
  },

  // Check if expired
  isExpired() {
    const now = new Date();
    return this.subscriptionStatus === "expired" || 
           (this.endDate && now > this.endDate) ||
           (this.trialEndDate && now > this.trialEndDate);
  },

  // Cancel subscription (graceful - continues until end date)
  async cancel(reason = "user_initiated") {
    this.subscriptionStatus = "cancelled";
    this.autoRenew = false;
    this.cancelledAt = new Date();
    this.metadata.cancellationReason = reason;
    await this.save();
    return this;
  },

  // Pause subscription
  async pause() {
    this.subscriptionStatus = "paused";
    this.paymentStatus = "paused";
    await this.save();
    return this;
  },

  // Resume subscription
  async resume() {
    this.subscriptionStatus = "active";
    this.paymentStatus = "active";
    await this.save();
    return this;
  },

  // Toggle auto-renew
  async toggleAutoRenew(enabled) {
    this.autoRenew = enabled;
    await this.save();
    return this;
  },

  // Update usage
  async updateUsage(type, count = 1) {
    if (this.usage && this.usage[type] !== undefined) {
      this.usage[type] = Math.max(0, (this.usage[type] || 0) + count);
      await this.save();
    }
    return this;
  },

  // Check feature access
  canUseFeature(feature, planDoc = null) {
    if (!planDoc) {
      // Plan should be populated
      planDoc = this.plan;
    }
    
    if (!planDoc?.access?.[feature]) {
      return false;
    }

    // Check usage limits for metered features
    switch (feature) {
      case "chatbot":
        if (planDoc.chatbot?.credits) {
          return (this.usage?.chatbotCreditsUsed || 0) < planDoc.chatbot.credits;
        }
        return true;
      case "unlimitedMessages":
        return planDoc.access.unlimitedMessages;
      default:
        return true;
    }
  },

  // Days remaining
  daysRemaining() {
    const now = new Date();
    const end = this.endDate || this.trialEndDate;
    return end ? Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24))) : 0;
  }
};

// Static methods
SubscriptionSchema.statics = {
  // Find active subscription for user
  async findActiveByUser(userId, userModel) {
    return this.findOne({
      user: userId,
      userModel,
      $or: [
        { 
          subscriptionStatus: "active", 
          endDate: { $gt: new Date() } 
        },
        { 
          subscriptionStatus: "trial", 
          trialEndDate: { $gt: new Date() } 
        }
      ]
    }).populate({
      path: "plan",
      select: "name price access chatbot duration"
    });
  },

  // Find subscriptions for renewal
  async findForRenewal() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.find({
      autoRenew: true,
      subscriptionStatus: "active",
      nextBillingDate: { $lte: tomorrow },
      renewalAttempts: { $lt: 3 },
      paymentStatus: "active",
      endDate: { $gt: new Date() }
    }).populate("plan");
  },

  // Get all subscriptions for user
  async getUserSubscriptions(userId, userModel) {
    return this.find({ user: userId, userModel })
      .populate({
        path: "plan",
        select: "name price access chatbot"
      })
      .sort({ startDate: -1 });
  },

  // Check if user has any active subscription
  async hasActiveSubscription(userId, userModel) {
    const count = await this.countDocuments({
      user: userId,
      userModel,
      $or: [
        { subscriptionStatus: "active", endDate: { $gt: new Date() } },
        { subscriptionStatus: "trial", trialEndDate: { $gt: new Date() } }
      ]
    });
    return count > 0;
  }
};

// Virtual for user type
SubscriptionSchema.virtual("userType").get(function() {
  return this.userModel === "Company" ? "business" : "individual";
});

// Cascade delete payment methods when subscription is removed
SubscriptionSchema.pre("deleteOne", { document: true, query: false }, async function(next) {
  try {
    const PaymentMethod = mongoose.model("PaymentMethod");
    await PaymentMethod.deleteMany({
      user: this.user,
      userModel: this.userModel,
      razorpaySubscriptionId: this.razorpaySubscriptionId
    });
    next();
  } catch (error) {
    next(error);
  }
});

// Add post-save hook for subscription renewed or payment failed
SubscriptionSchema.post('save', async function(doc) {
  if (this.isNew || this.isModified('subscriptionStatus') || this.isModified('paymentStatus')) {
    try {
      const Notification = require('./notification'); // Adjust path
      if (this.isNew && doc.subscriptionStatus === 'active') {
        await Notification.createNotification(
          doc.user, 
          doc.userModel, 
          'purchase_plan_status', 
          { 
            planName: doc.plan ? doc.plan.name : 'plan',
            status: 'purchased'
          }
        );
      } else if (doc.subscriptionStatus === 'active' && doc.endDate > new Date()) {
        await Notification.createNotification(
          doc.user, 
          doc.userModel, 
          'subscription_renewed', 
          { 
            planName: doc.plan ? doc.plan.name : 'plan',
            endDate: doc.endDate.toDateString() 
          }
        );
      } else if (doc.paymentStatus === 'failed') {
        await Notification.createNotification(
          doc.user, 
          doc.userModel, 
          'payment_failed', 
          {}
        );
      }
    } catch (error) {
      console.error('❌ Failed to create subscription notification:', error);
    }
  }
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);