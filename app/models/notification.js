// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "userModel",
      index: true,
    },
    userModel: {
      type: String,
      required: true,
      enum: ["LISTING", "Company", "SecureEmployee"],
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "mandi_rate_update",
        "purchase_plan_status",
        "new_mandi_ad",
        "new_job_post",
        "todays_job_post",
        "new_blog_post",
        "location_update",
        "plan_expiry_warning",
        "verification_required",
        "new_commodity_add",
        "new_category_add",
        "new_mandi_add"
      ],
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    pushSent: { type: Boolean, default: false },
    pushToken: { type: String },
    locationData: {
      state: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
      district: String,
      mandi: String,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, userModel: 1, createdAt: -1 });
notificationSchema.index({ user: 1, userModel: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

notificationSchema.statics.findUserNotifications = async function(userId, userModel, options = {}) {
  const { limit = 20, skip = 0, isRead, type, priority } = options;
  const query = { user: userId, userModel };
  
  if (isRead !== undefined) query.isRead = isRead;
  if (type) query.type = { $in: Array.isArray(type) ? type : [type] };
  if (priority) query.priority = priority;

  return this.find(query)
    .sort({ createdAt: -1, priority: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

module.exports = mongoose.model("Notification", notificationSchema);

// // models/Notification.js (unchanged from previous)
// const mongoose = require("mongoose");

// const notificationSchema = new mongoose.Schema(
//   {
//     // Dynamic reference to the user who receives the notification
//     // Can be LISTING, Company, or SecureEmployee
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       refPath: "userModel",
//       required: true,
//     },
//     userModel: {
//       type: String,
//       required: true,
//       enum: ["LISTING", "Company", "SecureEmployee"],
//     },

//     // Type of notification to categorize and handle differently in the app
//    // In models/Notification.js - Update the type enum:
// type: {
//   type: String,
//   enum: [
//     "mandi_rate_update",
//     "purchase_plan_status", 
//     "new_mandi_ad",
//     "new_job_post",
//     "todays_job_post",
//     "new_blog_post",
//     "location_update",
//     // Auction notifications
//     "new_auction_created",
//     "new_auction_available",
//     "new_bid_received",
//     "bid_placed_success", 
//     "auction_price_increased",
//     "auction_won",
//     "auction_completed",
//     "auction_lost",
//     "auction_expiring_soon"
//   ],
//   required: true,
// },

//     // The main notification message/text
//     message: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     // Optional additional data (e.g., { mandiId: "...", rate: { min: 100, max: 200 } })
//     // or { jobId: "...", title: "..." } for linking to details
//     data: {
//       type: mongoose.Schema.Types.Mixed,
//       default: null,
//     },

//     // Read status
//     isRead: {
//       type: Boolean,
//       default: false,
//     },

//     // Optional: Location-specific fields for filtering/querying
//     state: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
//     district: { type: String, trim: true },
//     mandi: { type: String, trim: true }, // or ref to Mandi if needed
//   },
//   {
//     timestamps: true,
//     indexes: [
//       { key: { user: 1, createdAt: -1 } }, // For efficient user-specific fetching, sorted by newest
//       { key: { type: 1 } },               // For type-based queries
//       { key: { state: 1, district: 1, mandi: 1 } }, // For location-based generation/queries
//     ],
//   }
// );

// // Static method to get notifications for a specific user
// notificationSchema.statics.getNotifications = async function (userId, userModel, options = {}) {
//   const { limit = 50, skip = 0, unreadOnly = false } = options;

//   const filter = { user: userId, userModel };
//   if (unreadOnly) {
//     filter.isRead = false;
//   }

//   return this.find(filter)
//     .sort({ createdAt: -1 }) // Newest first
//     .skip(skip)
//     .limit(limit)
//     .exec();
// };

// // Static method to mark a notification as read
// notificationSchema.statics.markAsRead = async function (notificationId) {
//   return this.findByIdAndUpdate(notificationId, { isRead: true }, { new: true }).exec();
// };

// // Static method to auto-generate a notification
// notificationSchema.statics.createNotification = async function (notificationData) {
//   const notification = new this(notificationData);
//   return notification.save();
// };

// module.exports = mongoose.model("Notification", notificationSchema);