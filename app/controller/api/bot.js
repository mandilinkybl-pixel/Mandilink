const ChatbotConversation = require("../../models/bot");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class BotController {
  async ask(req, res) {
    try {
      const { question, userId, userType } = req.body;
      if (!question || !userId || !userType) {
        return res.status(400).json({ success: false, error: "Question, userId, and userType are required" });
      }

      // Save user question
      let conversation = await ChatbotConversation.findOne({ userId });
      if (!conversation) {
        conversation = new ChatbotConversation({ userId, messages: [] });
      }
      conversation.messages.push({ sender: "user", text: question });
      await conversation.save();

      let answerText = "";

      // Call OpenAI
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: question }],
          temperature: 0.7,
          max_tokens: 250,
        });

        answerText = response.choices[0].message.content;

      } catch (err) {
        console.error("OpenAI API error:", err);
        answerText = "OpenAI API error or quota exceeded. Please try later.";
      }

      // Save bot answer
      conversation.messages.push({ sender: "bot", text: answerText });
      await conversation.save();

      res.json({ success: true, answer: answerText });

    } catch (err) {
      console.error("Bot error:", err);
      res.status(500).json({ success: false, error: "OpenAI API error or quota exceeded. Please try later." });
    }
  }
}

module.exports = new BotController();
