const mongoose = require("mongoose");

const mandiSchema = new mongoose.Schema(
  {
    mandiName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    state: { type: String, required: true },
    district: { type: String, required: true },
    pincode: { type: String },
    address: { type: String },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    contactPerson: { type: String },
    contactNumber: { type: String },
    email: { type: String },
    type: {
      type: String,
      enum: ["APMC", "Private", "eNAM", "Cooperative"],
      default: "APMC",
    },
    connectedWithENAM: { type: Boolean, default: false },
    commodityPrices: [
      {
        commodity: { type: mongoose.Schema.Types.ObjectId, ref: "Commodity", required: true },
        price: { type: Number, required: true },
        unit: { type: String, enum: ["₹/quintal", "₹/kg", "₹/ton", "₹/bag"], default: "₹/quintal" },
        weight: { type: Number, required: false }, // optional
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mandi", mandiSchema);