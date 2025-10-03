// services/notificationService.js
const Notification = require("../models/Notification");
const LISTING = require("../models/lisingSchema");
const Company = require("../models/companylisting");

// Fake push (replace with FCM / Expo / OneSignal)
const sendPushNotification = async (users, notification) => {
  for (let user of users) {
    if (user.pushToken) {
      console.log(`Push to ${user.name} (${user.state}/${user.district}): ${notification.title}`);
    }
  }
};

// Auto-generate messages
const generateMessage = (type, data) => {
  switch (type) {
    case "bid": return `New bid created for ${data.commodityName} starting at ₹${data.startingPrice}.`;
    case "job": return `New job posted: ${data.title} at ${data.companyName}.`;
    case "mandi": return `New mandi added: ${data.name} in ${data.district}.`;
    case "mandirate": return `Mandi rate updated for ${data.mandiName || "Unknown"} in ${data.district}.`;
    case "listing": return `New user registered: ${data.name}.`;
    case "company": return `New company registered: ${data.name}.`;
    case "blog": return `New blog posted: ${data.title}.`;
    case "commodity": return `New commodity added: ${data.name}.`;
    case "purchaseplan": return `${data.userName || "User"} purchased a new plan.`;
    default: return data.message || "You have a new notification.";
  }
};

// Create notification and send push
const createNotification = async ({ type, relatedId, state, district, data }) => {
  const message = generateMessage(type, data);
  const title = type.charAt(0).toUpperCase() + type.slice(1);

  const notification = new Notification({ title, message, type, relatedId, state, district });
  await notification.save();

  // Get users by state/district
  const listings = await LISTING.find({ isActive: true, state, district });
  const companies = await Company.find({ isActive: true, state, district });
  const allUsers = [...listings, ...companies];

  await sendPushNotification(allUsers, notification);

  return notification;
};

module.exports = { createNotification };
