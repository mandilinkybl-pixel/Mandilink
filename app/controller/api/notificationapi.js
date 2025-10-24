// controllers/UserNotificationController.js
const Notification = require("../../models/notification");
const Listing = require("../../models/lisingSchema");
const Company = require("../../models/companylisting");
const SecureEmployee = require("../../models/adminEmployee");

class UserNotificationController {

  // Detect user and get their state/district info
  async detectUserAndLocation(userId) {
    try {
      let user = await Listing.findById(userId)
        .populate("state category")
        .lean();
      if (user) return { model: "LISTING", user };

      user = await Company.findById(userId)
        .populate("state category")
        .lean();
      if (user) return { model: "Company", user };

      user = await SecureEmployee.findById(userId).lean();
      if (user) return { model: "SecureEmployee", user };

      console.warn("⚠️ User not found inside any model =>", userId);
      return { model: null, user: null };

    } catch (err) {
      console.error("❌ detectUserAndLocation error:", err);
      return { model: null, user: null };
    }
  }

  // Get notifications
  async getNotifications(req, res) {
    try {
      const { userId } = req.params;
      let { page = 1, limit = 20 } = req.query;
      page = Number(page);
      limit = Number(limit);
      const skip = (page - 1) * limit;

      const { user } = await this.detectUserAndLocation(userId);

      if (!user) {
        return res.json({
          success: true,
          notifications: [],
          unreadCount: 0,
          pagination: { page, limit }
        });
      }

      const locationQuery = {
        $or: [
          { user: userId },  // Direct notifications
          {
            // All notifications for user's district/state (all mandis)
            "data.state": user.state?._id || null,
            "data.district": user.district || null
          }
        ]
      };

      console.log("🔍 Notification Query:", JSON.stringify(locationQuery, null, 2));

      const [notifications, unreadCount] = await Promise.all([
        Notification.find(locationQuery)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Notification.countDocuments({
          user: userId,
          isRead: false
        })
      ]);

      const formatted = notifications.map(n => ({
        ...n,
        daysAgo: Math.floor((Date.now() - new Date(n.createdAt)) / 86400000)
      }));

      return res.json({
        success: true,
        notifications: formatted,
        unreadCount,
        pagination: { page, limit }
      });

    } catch (error) {
      console.error("❌ getNotifications Error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Mark single notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;

      const notification = await Notification.findByIdAndUpdate(
        id,
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }

      return res.json({ success: true, message: "Notification marked as read", notification });

    } catch (error) {
      console.error("❌ markAsRead error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Mark all notifications as read for user
  async markAllAsRead(req, res) {
    try {
      const { userId } = req.params;

      const result = await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true }
      );

      return res.json({ success: true, marked: result.modifiedCount });

    } catch (error) {
      console.error("❌ markAllAsRead error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get unread count
  async getUnreadCount(req, res) {
    try {
      const { userId } = req.params;

      const unreadCount = await Notification.countDocuments({
        user: userId,
        isRead: false
      });

      return res.json({ success: true, unreadCount });

    } catch (error) {
      console.error("❌ getUnreadCount error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new UserNotificationController();
