const ChatbotConversation = require('../../models/bot');
const axios = require('axios');

const MandiRate = require('../../models/dealymandiRateuapdate');
const LISTING = require('../../models/lisingSchema');
const Company = require('../../models/companylisting');
const SecureEmployee = require('../../models/adminEmployee');

// ---------------- Hugging Face Config ----------------
const HF_API_KEY = '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';

// ✅ Free hosted model
const HF_MODEL = 'gpt2';

// Function to call Hugging Face Inference API
async function askHuggingFace(question) {
  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      { inputs: question },
      {
        headers: { Authorization: `Bearer ${HF_API_KEY}` },
      }
    );

    if (Array.isArray(response.data) && response.data[0]?.generated_text) {
      return response.data[0].generated_text;
    } else if (typeof response.data === 'string') {
      return response.data;
    } else {
      return JSON.stringify(response.data);
    }
  } catch (err) {
    console.error(
      'HuggingFace API error:',
      err.response?.status,
      err.response?.data || err.message
    );
    return 'AI service is currently unavailable. Please try later.';
  }
}

// ---------------- Helper: Detect user type ----------------
async function detectUserType(userId) {
  if (!userId) return null;

  let user = await LISTING.findById(userId).select('_id');
  if (user) return 'LISTING';

  let company = await Company.findById(userId).select('_id');
  if (company) return 'Company';

  let employee = await SecureEmployee.findById(userId).select('_id');
  if (employee) return 'SecureEmployee';

  return null;
}

// ---------------- Bot Controller ----------------
class BotController {
  async ask(req, res) {
    try {
      const { userId, question } = req.body;
      if (!question || !userId) {
        return res
          .status(400)
          .json({ success: false, error: 'userId and question are required' });
      }

      const userModel = await detectUserType(userId);
      if (!userModel)
        return res.status(400).json({ success: false, error: 'User not found' });

      let conversation = await ChatbotConversation.findOne({ userId });
      if (!conversation) {
        conversation = new ChatbotConversation({
          userId,
          userModel,
          messages: [],
        });
      } else {
        conversation.userModel = userModel;
      }

      conversation.messages.push({ sender: 'user', text: question });
      await conversation.save();

      let answerText = '';
      const qLower = question.toLowerCase();

      if (qLower.includes('mandi rate') || qLower.includes('price of')) {
        const rates = await MandiRate.find()
          .populate('state', 'name')
          .populate('mandi', 'name')
          .populate('rates.commodity', 'name');

        if (rates.length === 0) answerText = 'No mandi rates found.';
        else {
          answerText = rates
            .map((r) => {
              const rateStr = r.rates
                .map(
                  (rt) => `${rt.commodity.name}: ₹${rt.minimum} - ₹${rt.maximum}`
                )
                .join(', ');
              return `${r.state.name} - ${r.district} - ${r.mandi.name}: ${rateStr}`;
            })
            .join('\n');
        }
      } else if (qLower.includes('farmer') || qLower.includes('user list')) {
        const farmers = await LISTING.find().select('name mandi district state');
        if (farmers.length === 0) answerText = 'No farmers found.';
        else
          answerText = farmers
            .map(
              (f) => `${f.name} - ${f.state} - ${f.district} - ${f.mandi}`
            )
            .join('\n');
      } else if (qLower.includes('company')) {
        const companies = await Company.find().select(
          'name mandi district state'
        );
        if (companies.length === 0) answerText = 'No companies found.';
        else
          answerText = companies
            .map(
              (c) => `${c.name} - ${c.state} - ${c.district} - ${c.mandi}`
            )
            .join('\n');
      } else {
        answerText = await askHuggingFace(question);
      }

      conversation.messages.push({ sender: 'bot', text: answerText });
      await conversation.save();

      res.json({ success: true, answer: answerText });
    } catch (err) {
      console.error('Bot error:', err);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
}

module.exports = new BotController();