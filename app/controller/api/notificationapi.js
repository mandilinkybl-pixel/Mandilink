// controllers/notificationController.js
const Notification = require("../../../app/models/notification");
const { createNotification } = require("../../message/message");

// Manually trigger notification
exports.triggerNotification = async (req, res) => {
  try {
    const { type, relatedId, state, district, data } = req.body;
    const notification = await createNotification({ type, relatedId, state, district, data });
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get notifications (optional filter by state/district)
exports.getNotifications = async (req, res) => {
  try {
    const { state, district } = req.query;
    let query = {};
    if (state) query.state = state;
    if (district) query.district = district;

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mark as read
exports.markAsRead = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { $addToSet: { isReadBy: userId } },
      { new: true }
    );
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
