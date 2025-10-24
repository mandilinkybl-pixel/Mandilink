// models/listingSchema.js
const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee" },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
  district: { type: String, required: true, trim: true },
  mandi: { type: String, required: true, trim: true },
  role: { type: String, enum: ["user", "company"], default: "user" },

  name: { type: String, required: true, trim: true },
  address: { type: String },
  passwordHash: { type: String },
  email: { 
    type: String, 
    trim: true, 
    index: { unique: true, partialFilterExpression: { email: { $exists: true, $ne: "" } } },
    sparse: true 
  },
  contactNumber: { type: String, required: true, trim: true, index: { unique: true, partialFilterExpression: { contactNumber: { $exists: true, $ne: "" } } } },
  
  // Subscription fields
  razorpayCustomerId: { type: String },
  currentPlan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
  subscriptionExpiry: { type: Date },
  subscriptionPreferences: {
    autoRenew: { type: Boolean, default: true },
    preferredBillingCycle: { type: String, enum: ["monthly", "quarterly", "yearly"], default: "monthly" },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },

  registrationStep: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  Verifybatch: { type: String, enum: ["batch1", "batch2", "batch3", "batch4"], trim: true },
  pushToken: { type: String }
}, { timestamps: true });

// Methods for subscription
listingSchema.methods = {
  hasActiveSubscription() {
    return this.subscriptionExpiry && this.subscriptionExpiry > new Date();
  },

  getContactEmail() {
    return this.email || `${this.name.toLowerCase().replace(/\s+/g, '')}@listing.com`;
  },

  getDisplayName() {
    return this.name;
  },

  async syncRazorpayCustomer(razorpay) {
    if (!this.razorpayCustomerId) {
      const customer = await razorpay.customers.create({
        name: this.getDisplayName(),
        email: this.getContactEmail(),
        contact: this.contactNumber,
        notes: { 
          listingId: this._id.toString(), 
          model: "LISTING",
          role: this.role,
          category: this.category
        }
      });
      this.razorpayCustomerId = customer.id;
      await this.save();
    }
    return this.razorpayCustomerId;
  }
};

listingSchema.index({ email: 1 });
listingSchema.index({ contactNumber: 1 });
listingSchema.index({ razorpayCustomerId: 1 });

module.exports = mongoose.model("LISTING", listingSchema);