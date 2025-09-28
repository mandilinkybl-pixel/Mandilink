const ChatbotConversation = require('../../models/bot');
const MandiRate = require('../../models/dealymandiRateuapdate');
const LISTING = require('../../models/lisingSchema');
const Company = require('../../models/companylisting');
const SecureEmployee = require('../../models/adminEmployee');
require('dotenv').config();

const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------------- OpenAI Inference with fallback ----------------
async function askOpenAI(question) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY in .env');
    return 'AI service is not configured properly.';
  }

  const models = ['gpt-4o-mini', 'gpt-3.5-turbo']; // fallback order

  for (const model of models) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: question }],
        max_tokens: 200,
      });

      const answer = response.choices[0]?.message?.content?.trim();
      if (answer) return answer;

    } catch (err) {
      console.error(`OpenAI API error with model ${model}:`, err.response?.data || err.message);
      // continue to next model if available
    }
  }

  return 'AI service is currently unavailable. Please try later.';
}

// ---------------- Detect user type ----------------
async function detectUserType(userId) {
  if (!userId) return null;
  if (await LISTING.exists({ _id: userId })) return 'LISTING';
  if (await Company.exists({ _id: userId })) return 'Company';
  if (await SecureEmployee.exists({ _id: userId })) return 'SecureEmployee';
  return null;
}

// ---------------- Bot Controller ----------------
class BotController {
  async ask(req, res) {
    try {
      const { userId, question } = req.body;

      // Validate inputs
      if (!userId || !question) {
        return res.status(400).json({ success: false, error: 'userId and question are required' });
      }

      // Detect user type
      const userModel = await detectUserType(userId);
      if (!userModel) {
        return res.status(400).json({ success: false, error: 'User not found' });
      }

      // Find or create conversation
      let conversation = await ChatbotConversation.findOne({ userId });
      if (!conversation) {
        conversation = new ChatbotConversation({ userId, userModel, messages: [] });
      } else {
        conversation.userModel = userModel;
      }

      // Save user question
      conversation.messages.push({ sender: 'user', text: question });
      if (conversation.messages.length > 50) {
        conversation.messages = conversation.messages.slice(-50);
      }
      await conversation.save();

      let answerText = '';
      const qLower = question.toLowerCase();

      // ---------------- Mandi Rates ----------------
      if (qLower.includes('mandi rate') || qLower.includes('price of')) {
        const rates = await MandiRate.find()
          .populate('state', 'name')
          .populate('mandi', 'name')
          .populate('rates.commodity', 'name');

        if (!rates.length) {
          answerText = 'No mandi rates found.';
        } else {
          answerText = rates
            .map((r) => {
              const rateStr = (r.rates || [])
                .map(rt => `${rt.commodity?.name || 'Unknown'}: ₹${rt.minimum} - ₹${rt.maximum}`)
                .join(', ');
              return `${r.state?.name || 'Unknown'} - ${r.district || ''} - ${r.mandi?.name || 'Unknown Mandi'}: ${rateStr}`;
            })
            .join('\n\n');
        }
      }
      // ---------------- Farmers ----------------
      else if (qLower.includes('farmer') || qLower.includes('user list')) {
        const farmers = await LISTING.find()
          .select('name mandi district state')
          .limit(20);

        answerText = farmers.length
          ? farmers.map(f => `${f.name} - ${f.state || ''} - ${f.district || ''} - ${f.mandi || ''}`).join('\n')
          : 'No farmers found.';
      }
      // ---------------- Companies ----------------
      else if (qLower.includes('company')) {
        const companies = await Company.find()
          .select('name mandi district state')
          .limit(20);

        answerText = companies.length
          ? companies.map(c => `${c.name} - ${c.state || ''} - ${c.district || ''} - ${c.mandi || ''}`).join('\n')
          : 'No companies found.';
      }
      // ---------------- Default: AI ----------------
      else {
        answerText = await askOpenAI(question);
      }

      // Save bot answer
      conversation.messages.push({ sender: 'bot', text: answerText });
      if (conversation.messages.length > 50) {
        conversation.messages = conversation.messages.slice(-50);
      }
      await conversation.save();

      return res.json({ success: true, answer: answerText });

    } catch (err) {
      console.error('Bot error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
}

module.exports = new BotController();
