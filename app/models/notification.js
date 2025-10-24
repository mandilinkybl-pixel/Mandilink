// models/notification.js (Updated createNotification to handle null userId for admin notifications)
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
        "new_mandi_add",
        "mandi_updated",
        "new_bid_post",
        "bid_won", // New for auctions
        "job_application_received", // New for jobs
        "subscription_renewed", // New for payments
        "payment_failed" // New for payments
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

/**
 * Generate title and message based on notification type and data
 * @param {string} type - Notification type
 * @param {Object} data - Additional data for templating
 * @returns {Object} - {title, message}
 */
const generateNotificationContent = (type, data = {}) => {
  const templates = {
    mandi_rate_update: {
      title: "🌾 Mandi Rate Updated",
      message: `Rates for ${data.commodityName || 'commodity'} at ${data.mandi || 'your mandi'} have changed: Min ₹${data.minimum || 0}, Max ₹${data.maximum || 0}.`,
    },
    purchase_plan_status: {
      title: "📋 Purchase Plan Update",
      message: `Your plan ${data.planName || 'ID'} status changed to ${data.status || 'updated'}. Check details.`,
    },
    new_mandi_ad: {
      title: "📢 New Mandi Ad",
      message: `New advertisement available for ${data.mandi || 'mandi'}. View now for opportunities!`,
    },
    new_job_post: {
      title: "💼 New Job Posted",
      message: `Exciting opportunity: "${data.title || 'position'}" at ${data.companyName || 'company'}. Apply today!`,
    },
    todays_job_post: {
      title: "📅 Today's Jobs",
      message: `${data.count || 0} new job posts today. Don't miss out—explore now!`,
    },
    new_blog_post: {
      title: "📖 New Blog Post",
      message: `Latest read: "${data.title || 'Insights'}" on ${data.category || 'topic'}.`,
    },
    location_update: {
      title: "📍 Location Updated",
      message: `Your preferred location is now ${data.district || 'new district'}, ${data.mandi || 'mandi'}.`,
    },
    plan_expiry_warning: {
      title: "⚠️ Plan Expiring Soon",
      message: `Your subscription ends in ${data.days || 7} days. Renew to keep accessing premium features.`,
    },
    verification_required: {
      title: "🔐 Verification Needed",
      message: `Complete your verification to unlock full access. Check your email/SMS.`,
    },
    new_commodity_add: {
      title: "🛢️ New Commodity Added",
      message: `"${data.name || 'commodity'}" is now available in our listings.`,
    },
    new_category_add: {
      title: "🗂️ New Category",
      message: `Explore the new category: "${data.name || 'section'}" for more options.`,
    },
    new_mandi_add: {
      title: "🏬 New Mandi Added",
      message: `New market "${data.name || 'mandi'}" in ${data.district || 'district'} is live.`,
    },
    mandi_updated: {
      title: "🏬 Mandi Updated",
      message: `Market "${data.name || 'mandi'}" in ${data.district || 'district'} has been updated.`,
    },
    new_bid_post: {
      title: "🔨 New Bid Posted",
      message: `New auction for "${data.commodityName || 'item'}" starting at ₹${data.startingPrice || 0} by ${data.createdBy || 'user'}.`,
    },
    bid_won: {
      title: "🎉 Auction Won!",
      message: `Congratulations! You won the bid for ${data.commodityName || 'item'} at ₹${data.amount || 0}.`,
    },
    job_application_received: {
      title: "📧 New Job Application",
      message: `Application received for "${data.jobTitle || 'your job'}" from ${data.applicantName || 'applicant'}.`,
    },
    subscription_renewed: {
      title: "💳 Subscription Renewed",
      message: `Your ${data.planName || 'plan'} has been renewed successfully until ${data.endDate || 'new date'}.`,
    },
    payment_failed: {
      title: "❌ Payment Failed",
      message: `Payment for your subscription failed. Update your details to avoid interruption.`,
    },
  };

  const template = templates[type];
  if (!template) {
    // Fallback for unknown types
    return {
      title: `New Update: ${type.replace(/_/g, ' ').toUpperCase()}`,
      message: `Check the app for details on the recent ${type} activity.`,
    };
  }

  // Enhanced templating: replace {key} placeholders
  let title = template.title;
  let message = template.message;
  Object.keys(data).forEach(key => {
    const placeholder = new RegExp(`{${key}}`, 'g');
    title = title.replace(placeholder, data[key] || '');
    message = message.replace(placeholder, data[key] || '');
  });

  return { title, message };
};

notificationSchema.statics.createNotification = async function(userId, userModel, type, data = {}, options = {}) {
  const { priority = "medium", locationData, pushToken, notifyAdmins = false } = options;

  const { title, message } = generateNotificationContent(type, data);

  const notificationData = {
    user: userId,
    userModel,
    type,
    title,
    message,
    data,
    priority,
    locationData,
    pushToken,
  };

  // Only create single notification if userId and userModel are provided
  let notification = null;
  if (userId && userModel) {
    notification = new this(notificationData);
    await notification.save();
  }

  // Always handle admin notifications if requested
  if (notifyAdmins) {
    const SecureEmployee = mongoose.model("SecureEmployee");
    const admins = await SecureEmployee.find({ role: "admin", isBlocked: false });
    for (const admin of admins) {
      const adminData = { ...notificationData, user: admin._id, userModel: "SecureEmployee" };
      const adminNotif = new this(adminData);
      await adminNotif.save();
    }
  }

  return notification; // Return the single one if created, else null
};

notificationSchema.statics.findUserNotifications = async function(userId, userModel, options = {}) {
  const { limit = 20, skip = 0, isRead, type, priority } = options;
  const query = { user: userId, userModel };
  
  if (isRead !== undefined) query.isRead = isRead;
  if (type) query.type = { $in: Array.isArray(type) ? type : [type] };
  if (priority) query.priority = priority;

  return this.find(query)
    .sort({ createdAt: -1, priority: -1 }) // High priority first
    .skip(skip)
    .limit(limit)
    .lean();
};

// Example auto-trigger hooks (add to relevant models, e.g., in MandiRate model)
notificationSchema.statics.triggerOnModelUpdate = async function(modelName, doc, type, affectedUsers = []) {
  // Generic trigger: Call this in post-save hooks of other models
  for (const user of affectedUsers) {
    await this.createNotification(user.userId, user.userModel, type, { ...doc.toObject(), ...user.data });
  }
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