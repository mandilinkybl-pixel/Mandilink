const mongoose = require("mongoose");

const chatbotConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userModel: {
      type: String,
      required: true,
      enum: ["LISTING", "Company", "SecureEmployee"],
    },
    messages: [
      {
        sender: { type: String, enum: ["user", "bot"], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    topic: {
      type: String,
      default: "agriculture",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatbotConversation", chatbotConversationSchema);
