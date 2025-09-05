const mongoose = require("mongoose");

const commoditySchema = new mongoose.Schema(
  {
    commodityName: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Grains",
        "Pulses",
        "Vegetables",
        "Fruits",
        "Spices",
        "Oilseeds",
        "Fibers",
        "Others"
      ],
      default: "Others"
    },
    subCategory: {
      type: String,
      trim: true
    },
    unit: {
      type: String,
      enum: ["₹/quintal", "₹/kg", "₹/ton"],
      default: "₹/quintal"
    },
    hsnCode: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Commodity", commoditySchema);
