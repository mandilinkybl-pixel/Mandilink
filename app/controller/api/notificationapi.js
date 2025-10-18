const Notification = require("../../models/notification");
const User = require("../../models/lisingSchema");
const Company = require("../../models/companylisting");

class UserNotificationController {
  /**
   * 🔍 Determine user model dynamically from userId
   */
  async getUserModelFromId(userId) {
    const user = await User.findById(userId);
    if (user) return "LISTING";

    const company = await Company.findById(userId);
    if (company) return "Company";

    throw new Error("User not found");
  }

  /**
   * 📬 Get paginated notifications
   * Route: GET /notifications/:userId
   */
  async getNotifications(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, type, isRead = "false" } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }

      const userModel = await this.getUserModelFromId(userId);
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [notifications, unreadCount] = await Promise.all([
        Notification.findUserNotifications(userId, userModel, {
          limit: parseInt(limit),
          skip,
          type,
          isRead: isRead === "true",
        }),
        Notification.countDocuments({ user: userId, userModel, isRead: false }),
      ]);

      return res.json({
        success: true,
        notifications,
        unreadCount,
        pagination: { page: Number(page), limit: Number(limit) },
      });
    } catch (error) {
      console.error("❌ Get notifications error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * ✅ Mark a specific notification as read
   * Route: PATCH /notifications/:userId/:id/read
   */
  async markAsRead(req, res) {
    try {
      const { userId, id } = req.params;

      if (!userId || !id) {
        return res.status(400).json({
          success: false,
          message: "userId and notification id are required",
        });
      }

      const userModel = await this.getUserModelFromId(userId);

      const notification = await Notification.findOneAndUpdate(
        { _id: id, user: userId, userModel, isRead: false },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found or already read",
        });
      }

      return res.json({
        success: true,
        message: "Notification marked as read",
        notification,
      });
    } catch (error) {
      console.error("❌ Mark as read error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * ✅ Mark all notifications as read for a user
   * Route: PATCH /notifications/:userId/read-all
   */
  async markAllAsRead(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }

      const userModel = await this.getUserModelFromId(userId);

      const result = await Notification.updateMany(
        { user: userId, userModel, isRead: false },
        { $set: { isRead: true } }
      );

      return res.json({
        success: true,
        marked: result.modifiedCount,
        message:
          result.modifiedCount > 0
            ? `${result.modifiedCount} notifications marked as read`
            : "No unread notifications found",
      });
    } catch (error) {
      console.error("❌ Mark all as read error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 🔢 Get count of unread notifications
   * Route: GET /notifications/:userId/unread-count
   */
  async getUnreadCount(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }

      const userModel = await this.getUserModelFromId(userId);

      const unreadCount = await Notification.countDocuments({
        user: userId,
        userModel,
        isRead: false,
      });

      return res.json({
        success: true,
        unreadCount,
      });
    } catch (error) {
      console.error("❌ Get unread count error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new UserNotificationController();
