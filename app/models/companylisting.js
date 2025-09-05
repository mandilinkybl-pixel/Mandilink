const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
  district: { type: String, required: true, trim: true },
  mandi: { type: String, required: true, trim: true },

  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  contactNumber: { type: String, required: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model("Company", companySchema);
