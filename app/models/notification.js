const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "bid",
        "job",
        "mandi",
        "mandirate",
        "listing",
        "company",
        "blog",
        "commodity",
        "purchaseplan",
        "general",
      ],
      default: "general",
    },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
    district: { type: String },
    isReadBy: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

// 🔹 Prevent OverwriteModelError by using the exact same name in check and registration
const Notification = mongoose.models.getnotify || mongoose.model("getnotify", notificationSchema);

module.exports = Notification;
