// models/commodity.model.js
const mongoose = require("mongoose");

const commoditySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Commodity", commoditySchema);
