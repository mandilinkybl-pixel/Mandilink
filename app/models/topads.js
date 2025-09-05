const mongoose = require("mongoose");

const adSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String, // store image path or URL
      required: true,
    },
    link: {
      type: String, // where the ad redirects
      required: true,
    },
    type: {
      type: String,
      enum: ["Top", "Bottom", "Sponsored", "Side"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date, // optional expiry
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SecureEmployee", // Admin/employee who created it
      required: true,
    },
  },
  { timestamps: true }
);

const Ad = mongoose.model("Ad", adSchema);

module.exports = Ad;
