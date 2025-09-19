// models/Listing.js  (your LISTING model)
const mongoose = require("mongoose");

const userschema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee" },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
  district: { type: String, required: true, trim: true },
  mandi: { type: String, required: true, trim: true },
  role: { type: String, enum:[ "user","company" ], default: "user" },

  name: { type: String, required: true, trim: true },
  address: { type: String },
  passwordHash: { type: String },
  email: { type: String, trim: true, index: { unique: true, partialFilterExpression: { email: { $exists: true, $ne: "" } } } },
  contactNumber: { type: String, required: true, trim: true, index: { unique: true, partialFilterExpression: { contactNumber: { $exists: true, $ne: "" } } } },
  registrationStep: { type: Number, default: 0 }, // 0..3 for user
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  Verifybatch: { type: String, enum: ["batch1", "batch2", "batch3", "batch4"], trim: true },
  pushToken: { type: String }

}, { timestamps: true });

module.exports = mongoose.model("LISTING", userschema);
