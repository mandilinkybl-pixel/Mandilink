// utils/pushNotification.js
const admin = require("firebase-admin");
const Notification = require("../models/notification");
const mongoose = require("mongoose");

const sendPushNotification = async (notificationData) => {
  try {
    if (!notificationData.pushToken || notificationData.pushSent) return;

    const message = {
      token: notificationData.pushToken,
      notification: {
        title: notificationData.title,
        body: notificationData.message,
      },
      data: {
        type: notificationData.type,
        notificationId: notificationData._id?.toString() || new mongoose.Types.ObjectId().toString(),
        priority: notificationData.priority,
        ...notificationData.data,
      },
      android: {
        priority: notificationData.priority === "high" ? "high" : "normal",
        notification: { sound: "default", channelId: "default" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ Push sent:", response);

    if (notificationData._id) {
      await Notification.findByIdAndUpdate(notificationData._id, { pushSent: true });
    }

    return response;
  } catch (error) {
    console.error("❌ Push failed:", error);
    throw error;
  }
};

module.exports = { sendPushNotification };