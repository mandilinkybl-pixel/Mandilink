const mongoose = require("mongoose");

const userschema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee", required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
  district: { type: String, required: true, trim: true },
  mandi: { type: String, required: true, trim: true },
  role: { type: String, enum:[ "user"], default: "user" },

  name: { type: String, required: true, trim: true },
  address: { type: String },
  contactNumber: { type: String, required: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model("LISTING", userschema);
