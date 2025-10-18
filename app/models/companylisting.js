const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee" },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
  district: { type: String, required: true, trim: true },
  mandi: { type: String, required: true, trim: true },

  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  contactNumber: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    trim: true, 
    index: { unique: true, partialFilterExpression: { email: { $exists: true, $ne: "" } } },
    sparse: true 
  },
  gstNumber: { type: String, trim: true, index: { unique: true, partialFilterExpression: { gstNumber: { $exists: true, $ne: "" } } } },
  licenseNumber: { type: String, trim: true, index: { unique: true, partialFilterExpression: { licenseNumber: { $exists: true, $ne: "" } } } },

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
  passwordHash: { type: String },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  Verifybatch: { type: String, enum: ["batch1", "batch2", "batch3", "batch4"], trim: true },
  pushToken: { type: String }
}, { timestamps: true });

// Methods for subscription
companySchema.methods = {
  hasActiveSubscription() {
    return this.subscriptionExpiry && this.subscriptionExpiry > new Date();
  },

  getContactEmail() {
    return this.email || (this.contactPerson && `${this.contactPerson.toLowerCase().replace(/\s+/g, '')}@${this.name.toLowerCase().replace(/\s+/g, '')}.com`);
  },

  getDisplayName() {
    return this.name || this.contactPerson || "Company User";
  },

  async syncRazorpayCustomer(razorpay) {
    if (!this.razorpayCustomerId) {
      const customer = await razorpay.customers.create({
        name: this.getDisplayName(),
        email: this.getContactEmail(),
        contact: this.contactNumber,
        notes: { 
          companyId: this._id.toString(), 
          model: "Company",
          type: "business",
          gstNumber: this.gstNumber
        }
      });
      this.razorpayCustomerId = customer.id;
      await this.save();
    }
    return this.razorpayCustomerId;
  }
};

companySchema.index({ email: 1 });
companySchema.index({ razorpayCustomerId: 1 });
companySchema.index({ currentPlan: 1 });

module.exports = mongoose.model("Company", companySchema);