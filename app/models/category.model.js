// models/Category.js
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

categorySchema.post('save', async function(doc) {
  if (this.isNew && doc.status === 'active') { // Only on create and active
    try {
      const Notification = require('./notification'); // Adjust path as needed
      // Notify all admins about new category
      await Notification.createNotification(
        null, null, 
        'new_category_add', 
        { name: doc.name }, 
        { notifyAdmins: true }
      );
    } catch (error) {
      console.error('❌ Failed to create category add notification:', error);
    }
  }
});

module.exports = mongoose.model("Category", categorySchema);