// models/mandi.js
const mongoose = require("mongoose");

const mandiSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee", required: true },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
    district: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },

  },
  { timestamps: true }
);

mandiSchema.post('save', async function(doc) {
  try {
    const Notification = require('./notification'); // Adjust path as needed
    const type = this.isNew ? 'new_mandi_add' : 'mandi_updated';
    const data = { 
      name: doc.name, 
      district: doc.district,
      state: doc.state
    };

    // Notify all admins
    await Notification.createNotification(
      null, null, 
      type, 
      data, 
      { notifyAdmins: true }
    );

    // If update, notify affected users in the mandi (similar to rate update)
    if (!this.isNew) {
      const Listing = require('./listingSchema'); // Adjust path
      const Company = require('./companylisting'); // Adjust path

      const listings = await Listing.find({ 
        state: doc.state, 
        district: doc.district, 
        mandi: doc.name, // Assuming mandi is name string
        isActive: true 
      });
      const companies = await Company.find({ 
        state: doc.state, 
        district: doc.district, 
        mandi: doc.name,
        isActive: true 
      });

      const affectedUsers = [
        ...listings.map(l => ({ userId: l._id, userModel: 'LISTING' })),
        ...companies.map(c => ({ userId: c._id, userModel: 'Company' }))
      ];

      for (const user of affectedUsers) {
        await Notification.createNotification(
          user.userId, 
          user.userModel, 
          type, 
          data
        );
      }
    }
  } catch (error) {
    console.error('❌ Failed to create mandi notification:', error);
  }
});

module.exports = mongoose.model("Mandi", mandiSchema);