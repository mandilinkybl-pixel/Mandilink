// controllers/notificationRetriever.js (Module for getting notifications)
const Notification = require("../../models/notification");

async function getUserNotifications(userId, userModel, options = { limit: 50, unreadOnly: false }) {
  try {
    const query = { user: userId, userModel };
    if (options.unreadOnly) query.isRead = false;
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit);
    return notifications;
  } catch (error) {
    console.error("Get notifications error:", error);
    throw new Error("Failed to get notifications");
  }
}

async function markAsRead(notificationId, userId, userModel) {
  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
      userModel,
    });
    if (!notification) throw new Error("Notification not found");
    notification.isRead = true;
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Mark as read error:", error);
    throw new Error("Failed to mark as read");
  }
}

module.exports = {
  getUserNotifications,
  markAsRead,
};