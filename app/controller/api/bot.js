const ChatbotConversation = require('../../models/bot');
const MandiRate = require('../../models/dealymandiRateuapdate');
const LISTING = require('../../models/lisingSchema');
const Company = require('../../models/companylisting');
const SecureEmployee = require('../../models/adminEmployee');
require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---------------- Gemini Inference with India-Specific Context ----------------
async function askGemini(question, history = []) {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY');
    return 'AI service configuration error.';
  }

  try {
    // We provide a System Instruction to lock the AI into the Indian Agri context
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: "You are an expert assistant for the Indian Agricultural Market (Mandi). Only provide information related to Indian states, districts, and crops. If a user asks about non-Indian markets, politely inform them you only support Indian Mandi data."
    });

    const formattedHistory = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(question);
    return result.response.text();

  } catch (err) {
    console.error(`Gemini API error:`, err.message);
    return 'The AI service is currently busy. Please try asking about Mandi rates again in a moment.';
  }
}

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
      if (!userId || !question) {
        return res.status(400).json({ success: false, error: 'userId and question are required' });
      }

      const userType = await detectUserType(userId);
      if (!userType) return res.status(404).json({ success: false, error: 'User not found' });

      let conversation = await ChatbotConversation.findOne({ userId }) || new ChatbotConversation({ userId, userModel: userType, messages: [] });

      let answerText = '';
      const qLower = question.toLowerCase();

      // ---------------- DATA SOURCE: INDIAN MANDI RATES ----------------
      if (qLower.includes('rate') || qLower.includes('price') || qLower.includes('mandi')) {
        // Fetching Indian Mandi data with population
        const rates = await MandiRate.find()
          .populate('state', 'name')
          .populate('mandi', 'name')
          .populate('rates.commodity', 'name')
          .limit(5); // Limit to keep response clean

        if (rates.length > 0) {
          answerText = "Current Mandi Rates in India:\n" + rates.map(r => {
            const commodityPrices = r.rates.map(rt => 
              `${rt.commodity?.name || 'Crop'}: ₹${rt.minimum} - ₹${rt.maximum}`
            ).join(' | ');
            return `📍 ${r.mandi?.name || 'Mandi'}, ${r.state?.name || 'State'}: ${commodityPrices}`;
          }).join('\n\n');
        } else {
          answerText = "I couldn't find live rates for that specific location in India right now.";
        }
      } 
      // ---------------- DATA SOURCE: INDIAN FARMERS/LISTINGS ----------------
      else if (qLower.includes('farmer') || qLower.includes('seller')) {
        const farmers = await LISTING.find({}).select('name mandi state').limit(10);
        answerText = farmers.length 
          ? "Registered Indian Farmers/Sellers:\n" + farmers.map(f => `• ${f.name} (Mandi: ${f.mandi || 'N/A'}, ${f.state || ''})`).join('\n')
          : "No farmer listings found in our Indian database.";
      }
      // ---------------- DATA SOURCE: GEMINI AI (General India Agri Queries) ----------------
      else {
        answerText = await askGemini(question, conversation.messages);
      }

      // Update Conversation History
      conversation.messages.push({ sender: 'user', text: question });
      conversation.messages.push({ sender: 'bot', text: answerText });
      
      // Maintain history limit
      if (conversation.messages.length > 50) conversation.messages.shift();
      
      await conversation.save();
      return res.json({ success: true, answer: answerText });

    } catch (err) {
      console.error('Controller Error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

module.exports = new BotController();