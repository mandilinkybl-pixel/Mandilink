const mongoose = require("mongoose");

const mandiRateSchema = new mongoose.Schema({
  state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
  district: { type: String, required: true, trim: true },
  mandi: { type: mongoose.Schema.Types.ObjectId, ref: "Mandi", required: true },
  rates: [
    {
      commodity: { type: mongoose.Schema.Types.ObjectId, ref: "Commodity", required: true },
      minimum: { type: Number, min: 0, required: true },
      maximum: { type: Number, min: 0, required: true },
      estimatedArrival: { type: Number, min: 0, default: null }, // in quantity; null means not reported
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("MandiRate", mandiRateSchema);