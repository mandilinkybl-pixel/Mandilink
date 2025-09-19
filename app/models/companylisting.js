// models/Company.js
const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee" },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
  district: { type: String, required: true, trim: true },
  mandi: { type: String, required: true, trim: true },

  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  contactNumber: { type: String, required: true, trim: true },
  email: { type: String, trim: true, index: { unique: true, partialFilterExpression: { email: { $exists: true, $ne: "" } } } },
  gstNumber: { type: String, trim: true, index: { unique: true, partialFilterExpression: { gstNumber: { $exists: true, $ne: "" } } } },
  licenseNumber: { type: String, trim: true, index: { unique: true, partialFilterExpression: { licenseNumber: { $exists: true, $ne: "" } } } },

  registrationStep: { type: Number, default: 0 }, // 0..4
  passwordHash: { type: String }, // keep hashed pw if company has login
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  Verifybatch: { type: String, enum: ["batch1", "batch2", "batch3", "batch4"], trim: true },
  pushToken: { type: String }

}, { timestamps: true });

module.exports = mongoose.model("Company", companySchema);
