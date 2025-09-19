// models/Support.js
const mongoose = require("mongoose");

const SupportSchema = new mongoose.Schema(
  {
    // Either user or company will be set
    user: { type: mongoose.Schema.Types.ObjectId, ref: "LISTING", default: null },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },

    ticketNumber: { type: String, required: true, unique: true, index: true },

    category: {
      type: String,
      enum: ["account", "payment", "subscription", "technical", "complaint", "other"],
      default: "other",
    },

    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // Threaded conversation (user/admin/company messages)
    conversation: [
      {
        senderType: { type: String, enum: ["user", "company", "admin"], required: true },
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "conversation.$.senderRef", // Dynamic reference
          required: true,
        },
        senderRef: {
          type: String,
          required: true,
          enum: ["LISTING", "Company", "SecureEmployee"], // Actual model names
        },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Pre-validate hook to generate unique ticketNumber if not set
SupportSchema.pre("validate", function (next) {
  if (!this.ticketNumber) {
    this.ticketNumber = `TCK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

module.exports = mongoose.model("Support", SupportSchema);
