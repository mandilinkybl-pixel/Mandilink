const mongoose = require("mongoose");

const BidSchema = new mongoose.Schema(
  {
    commodityName: { type: String, required: true },
    harvestTiming: { type: String, required: true },
    quality: { type: String, required: true },

    // Quantity
    quantity: {
      amount: { type: Number, required: true },
      
      unit: { type: String, enum: ["kg", "quintal", "bag"], required: true },
    },

    // Prices
    startingPrice: { type: Number, required: true },
    currentPrice: { type: Number, required: true },

    duration: { type: Number, required: true }, // auction duration in hours
    endTime: { type: Date }, // auto-set before save

    image: { type: String },
    

    // Auction creator (SecureEmployee / Company / LISTING)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "createdByModel",
    },
    createdByModel: {
      type: String,
      required: true,
      enum: ["SecureEmployee", "Company", "LISTING"],
    },

    // Bidders
    bids: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, refPath: "bids.userModel" },
        userModel: {
          type: String,
          enum: ["SecureEmployee", "Company", "LISTING"],
        },
        amount: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Auto set endTime
BidSchema.pre("save", function (next) {
  if (this.isNew && this.duration) {
    this.endTime = new Date(Date.now() + this.duration * 60 * 60 * 1000);
  }
  next();
});

// Virtual property
BidSchema.virtual("isExpired").get(function () {
  return this.endTime && new Date() > this.endTime;
});

module.exports = mongoose.model("Bid", BidSchema);
