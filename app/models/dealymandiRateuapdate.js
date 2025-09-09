const mongoose = require("mongoose");

const mandiRateSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee", required: true },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
    district: { type: String, required: true, trim: true },
    mandi: { type: mongoose.Schema.Types.ObjectId, ref: "Mandi", required: true },
    rates: [
      {
        commodity: { type: mongoose.Schema.Types.ObjectId, ref: "Commodity", required: true },
        minimum: { type: Number, min: 0, required: true },
        maximum: { 
          type: Number, 
          min: 0, 
          required: true,
          validate: {
            validator: function(value) {
              return value >= this.minimum;
            },
            message: "Maximum price must be greater than or equal to minimum price",
          },
        },
        estimatedArrival: { type: Number, min: 0, default: null },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    indexes: [
      { key: { state: 1, district: 1, mandi: 1 }, unique: true }, // Ensure unique state/district/mandi combination
      { key: { user_id: 1 } }, // Index for potential user-based queries
    ],
  }
);

module.exports = mongoose.model("MandiRate", mandiRateSchema);