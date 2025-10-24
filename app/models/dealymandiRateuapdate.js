// models/mandiRate.js (Updated hook to store full names in data - no fetch on getNotifications)
const mongoose = require("mongoose");

const mandiRateSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "SecureEmployee", required: true },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
    district: { type: String, required: true, trim: true },
    mandi: { type: mongoose.Schema.Types.ObjectId, ref: "Mandi", required: true },
    rates: [
      {
        commodity: { type: mongoose.Schema.Types.ObjectId, ref: "Commodity", required: true },
        minimum: { type: Number, min: 0, required: true },
        maximum: { 
          type: Number, 
          min: 0, 
          required: true,
          validate: {
            validator: function(value) {
              return value >= this.minimum;
            },
            message: "Maximum price must be greater than or equal to minimum price",
          },
        },
        estimatedArrival: { type: Number, min: 0, default: null },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    indexes: [
      { key: { state: 1, district: 1, mandi: 1 }, unique: true }, // Ensure unique state/district/mandi combination
      { key: { user_id: 1 } }, // Index for potential user-based queries
    ],
  }
);

mandiRateSchema.post('save', async function(doc) {
  try {
    const Notification = require('./notification'); // Adjust path as needed
    const Listing = require('./lisingSchema'); // Adjust path
    const Company = require('./companylisting'); // Adjust path
    const Mandi = require('./mandilistmodel'); // For populating mandi name
    const Commodity = require('./commodityname'); // For populating commodity name
    const State = require('./stateSchema'); // For state name

    // Populate essential refs once
    await doc.populate([{ path: 'mandi', select: 'name' }, { path: 'state', select: 'name' }]);
    const mandiName = doc.mandi ? doc.mandi.name : 'Unknown Mandi';
    const stateName = doc.state ? doc.state.name : 'Unknown State';

    // Find affected users: LISTING and Company in same state/district/mandi
    // Note: Assuming mandi field in Listing/Company is ObjectId ref to Mandi; if string, adjust to { mandi: mandiName }
    const listings = await Listing.find({ 
      state: doc.state, 
      district: doc.district, 
      mandi: doc.mandi, // Use ObjectId if ref, or mandiName if string
      isActive: true 
    });
    const companies = await Company.find({ 
      state: doc.state, 
      district: doc.district, 
      mandi: doc.mandi, // Same as above
      isActive: true 
    });

    const affectedUsers = [
      ...listings.map(l => ({ userId: l._id, userModel: 'LISTING' })),
      ...companies.map(c => ({ userId: c._id, userModel: 'Company' }))
    ];

    if (affectedUsers.length > 0) {
      // For each rate update, populate and notify with full data
      for (const rate of doc.rates) {
        // Populate commodity name
        const commodity = await Commodity.findById(rate.commodity).select('name').lean();
        const commodityName = commodity ? commodity.name : 'Unknown';

        // Full data payload with names/values
        const fullData = { 
          commodityName,
          commodityId: rate.commodity,
          mandi: doc.mandi,
          mandiName,
          minimum: rate.minimum,
          maximum: rate.maximum,
          district: doc.district,
          state: doc.state._id,
          stateName,
          estimatedArrival: rate.estimatedArrival,
          updatedAt: rate.updatedAt
        };

        // Notify each affected user individually (location-wise: all in same state/district/mandi)
        for (const user of affectedUsers) {
          await Notification.createNotification(
            user.userId, 
            user.userModel, 
            'mandi_rate_update', 
            fullData // Full enriched data stored here
          );
        }
      }
    }

    // Admin broadcast with overview full data
    const ratesData = await Promise.all(doc.rates.map(async rate => {
      const commodity = await Commodity.findById(rate.commodity).select('name').lean();
      return {
        commodityId: rate.commodity,
        commodityName: commodity?.name || 'Unknown',
        minimum: rate.minimum,
        maximum: rate.maximum
      };
    }));

    const adminData = { 
      mandi: doc.mandi,
      mandiName,
      district: doc.district,
      state: doc.state._id,
      stateName,
      rates: doc.rates.length,
      ratesData
    };
    await Notification.createNotification(
      null, null, 
      'mandi_rate_update', 
      adminData, 
      { notifyAdmins: true }
    );
  } catch (error) {
    console.error('❌ Failed to create mandi rate update notifications:', error);
  }
});

module.exports = mongoose.model("MandiRate", mandiRateSchema);