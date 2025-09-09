const mongoose = require("mongoose");

const mandiSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee", required: true },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
    district: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },

  },
  { timestamps: true }
);

module.exports = mongoose.model("Mandi", mandiSchema);
