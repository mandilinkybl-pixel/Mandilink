const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PaymentMethodSchema = new Schema({
  // Polymorphic reference
  user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  userModel: { 
    type: String, 
    enum: ["LISTING", "Company", "SecureEmployee"], 
    required: true,
    index: true 
  },

  // Razorpay IDs
  razorpayCustomerId: { type: String, required: true },
  razorpayPaymentMethodId: { type: String, required: true },
  cardId: { type: String },

  // Card details (masked)
  last4: { type: String, required: true },
  network: { type: String },
  type: { type: String }, // visa, mastercard, etc.
  expiryMonth: { type: Number, required: true },
  expiryYear: { type: Number, required: true },
  
  // Billing info
  billingName: { type: String },
  billingAddress: { type: String },
  
  // Status
  isDefault: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ["active", "paused", "expired", "removed"], 
    default: "active" 
  },

  // Metadata
  metadata: {
    createdVia: { type: String },
    ipAddress: { type: String }
  }
}, { timestamps: true });

// Indexes
PaymentMethodSchema.index({ user: 1, userModel: 1 });
PaymentMethodSchema.index({ razorpayPaymentMethodId: 1 });
PaymentMethodSchema.index({ isDefault: 1, user: 1, userModel: 1 });

// Ensure only one default per user
PaymentMethodSchema.pre("save", async function(next) {
  if (this.isDefault && this.isModified("isDefault")) {
    try {
      const PaymentMethod = mongoose.model("PaymentMethod");
      await PaymentMethod.updateMany(
        { 
          user: this.user, 
          userModel: this.userModel, 
          _id: { $ne: this._id } 
        },
        { isDefault: false }
      );
    } catch (error) {
      return next(error);
    }
  }
  next();
});

PaymentMethodSchema.methods = {
  isExpired() {
    const now = new Date();
    const expiry = new Date(`${this.expiryYear}-${this.expiryMonth}-01`);
    return now > expiry;
  }
};

PaymentMethodSchema.statics = {
  findDefault(userId, userModel) {
    return this.findOne({
      user: userId,
      userModel,
      isDefault: true,
      status: "active"
    });
  }
};

module.exports = mongoose.model("PaymentMethod", PaymentMethodSchema);