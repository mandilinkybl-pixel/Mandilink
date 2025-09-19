const mongoose = require("mongoose");

const chatbotConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ["user", "bot"],
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    topic: {
      type: String,
      default: "agriculture", // default chatbot topic
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatbotConversation", chatbotConversationSchema);
