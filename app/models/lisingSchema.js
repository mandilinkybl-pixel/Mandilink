const mongoose = require("mongoose");

const userschema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee" },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
  district: { type: String, required: true, trim: true },
  mandi: { type: String, required: true, trim: true },
  role: { type: String, enum:[ "user"], default: "user" },

  name: { type: String, required: true, trim: true },
  address: { type: String },
  password: { type: String },
  email: { type: String, trim: true, unique: true, sparse: true },
  contactNumber: { type: String, required: true, trim: true, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  Verifybatch: { type: String, enum: ["batch1", "batch2", "batch3", "batch4"], trim: true },
  pushToken: { type: String }

}, { timestamps: true });

module.exports = mongoose.model("LISTING", userschema);
