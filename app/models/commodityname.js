// models/commodity.model.js
const mongoose = require("mongoose");

const commoditySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

commoditySchema.post('save', async function(doc) {
  if (this.isNew && doc.status === 'active') { // Only on create and active
    try {
      const Notification = require('./notification'); // Adjust path as needed
      // Notify all admins about new commodity
      await Notification.createNotification(
        null, null, 
        'new_commodity_add', 
        { name: doc.name }, 
        { notifyAdmins: true }
      );
    } catch (error) {
      console.error('❌ Failed to create commodity add notification:', error);
    }
  }
});

module.exports = mongoose.model("Commodity", commoditySchema);