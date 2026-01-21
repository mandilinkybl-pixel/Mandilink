// models/Plan.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PlanSchema = new Schema(
  {
    name: { type: String, required: true, unique: true }, // free, premium, gold, etc.
    description: { type: String },

    // Pricing & Duration
    price: { type: Number, default: 0 }, // 0 for free
    duration: { type: Number, default: 30 }, // in days

    // Access Rights (Features)
    access: {
      chat: { type: Boolean, default: false },
      contact: { type: Boolean, default: false },
      postAds: { type: Boolean, default: false },
      premiumBadge: { type: Boolean, default: false },
      jobPost: { type: Boolean, default: false },
      bidding: { type: Boolean, default: false },
      bidPost: { type: Boolean, default: false },
      profileHighlight: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      unlimitedMessages: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      boostAds: { type: Boolean, default: false },
      multipleLanguages: { type: Boolean, default: false },
      featuredPlacement: { type: Boolean, default: false },
    },

    // Chatbot-specific configuration
    chatbot: {
      delay: { type: Number, default: 5 }, // seconds delay between responses
      credits: { type: Number, default: 100 }, // number of chatbot interactions per month
    },
    batch: {
      type: String,
      enum: ["basic", "standard", "premium"],
      default: "basic",
    },

    // 🔹 Multiple categories per plan
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", PlanSchema);