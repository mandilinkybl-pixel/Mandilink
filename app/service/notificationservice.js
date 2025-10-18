// services/notificationService.js
const Notification = require("../models/notification");
const Mandi = require("../models/mandilistmodel");
const MandiRate = require("../models/mandirates");
const MandiAd = require("../models/mandilistmodel");
const Category = require("../models/category.model");
const Commodity = require("../models/commodityname");
const Listing = require("../models/lisingSchema");
const Company = require("../models/companylisting");
const { sendPushNotification } = require("../utills/pushNotification");

class NotificationService {
  static async generateNewMandiNotifications(mandiDoc) {
    try {
      console.log("🚀 Generating new mandi notifications for:", mandiDoc.name);
      await mandiDoc.populate('state');

      const [listings, companies] = await Promise.all([
        Listing.find({
          state: mandiDoc.state,
          isActive: true,
          isVerified: true
        }).select("user_id pushToken"),
        Company.find({
          state: mandiDoc.state,
          isActive: true,
          isVerified: true
        }).select("user_id pushToken")
      ]);

      const users = [
        ...listings.map(l => ({ id: l.user_id, model: "LISTING", pushToken: l.pushToken })),
        ...companies.map(c => ({ id: c.user_id, model: "Company", pushToken: c.pushToken }))
      ].filter(u => u.pushToken);

      const notifications = users.map(user => ({
        user: user.id,
        userModel: user.model,
        type: "new_mandi_add",
        title: "🆕 New Mandi Added!",
        message: `New mandi "${mandiDoc.name}" is now available in ${mandiDoc.district} district.`,
        data: {
          mandiId: mandiDoc._id,
          mandiName: mandiDoc.name,
          district: mandiDoc.district,
          state: mandiDoc.state._id
        },
        priority: "medium",
        pushToken: user.pushToken,
        locationData: {
          state: mandiDoc.state._id,
          district: mandiDoc.district,
          mandi: mandiDoc.name,
        }
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        await Promise.all(notifications.map(n => sendPushNotification(n)));
        console.log(`✅ Created ${notifications.length} new mandi notifications`);
      }
    } catch (error) {
      console.error("❌ New mandi notification error:", error);
    }
  }

  static async generateMandiRateNotifications(mandiRateDoc) {
    try {
      console.log("🚀 Generating mandi rate notifications...");
      
      const mandi = await Mandi.findOne({ 
        name: mandiRateDoc.mandi,
        district: mandiRateDoc.district,
        state: mandiRateDoc.state 
      }).populate('state');

      if (!mandi) {
        console.log("⚠️ Mandi not found for rate notifications");
        return;
      }

      await mandiRateDoc.populate('rates.commodity');

      const [listings, companies] = await Promise.all([
        Listing.find({
          state: mandiRateDoc.state,
          district: mandiRateDoc.district,
          isActive: true,
          isVerified: true
        }).select("user_id pushToken"),
        Company.find({
          state: mandiRateDoc.state,
          district: mandiRateDoc.district,
          isActive: true,
          isVerified: true
        }).select("user_id pushToken")
      ]);

      const users = [
        ...listings.map(l => ({ id: l.user_id, model: "LISTING", pushToken: l.pushToken })),
        ...companies.map(c => ({ id: c.user_id, model: "Company", pushToken: c.pushToken }))
      ].filter(u => u.pushToken);

      const ratesPreview = mandiRateDoc.rates.slice(0, 3).map(r => 
        `📈 ${r.commodity?.name || 'Item'}: ₹${r.minimum}-${r.maximum}`
      ).join('\n');

      const notifications = users.map(user => ({
        user: user.id,
        userModel: user.model,
        type: "mandi_rate_update",
        title: `🛒 ${mandiRateDoc.mandi} Rates Updated!`,
        message: `Fresh rates:\n${ratesPreview}\n\nCheck now!`,
        data: {
          mandiRateId: mandiRateDoc._id,
          mandiId: mandi._id,
          mandiName: mandiRateDoc.mandi,
          district: mandiRateDoc.district,
          rates: mandiRateDoc.rates
        },
        priority: "high",
        pushToken: user.pushToken,
        locationData: {
          state: mandiRateDoc.state,
          district: mandiRateDoc.district,
          mandi: mandiRateDoc.mandi,
        }
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        await Promise.all(notifications.map(n => sendPushNotification(n)));
        console.log(`✅ Created ${notifications.length} mandi rate notifications`);
      }
    } catch (error) {
      console.error("❌ Mandi rate notification error:", error);
    }
  }

  static async generateNewMandiAdNotifications(mandiAdDoc) {
    try {
      console.log("🚀 Generating new mandi ad notifications...");
      
      const mandi = await Mandi.findOne({ 
        name: mandiAdDoc.mandi,
        district: mandiAdDoc.district 
      });

      if (!mandi) {
        console.log("⚠️ Mandi not found for ad notifications");
        return;
      }

      const [listings, companies] = await Promise.all([
        Listing.find({
          state: mandi.state,
          district: mandiAdDoc.district,
          isActive: true,
          isVerified: true
        }).select("user_id pushToken"),
        Company.find({
          state: mandi.state,
          district: mandiAdDoc.district,
          isActive: true,
          isVerified: true
        }).select("user_id pushToken")
      ]);

      const users = [
        ...listings.map(l => ({ id: l.user_id, model: "LISTING", pushToken: l.pushToken })),
        ...companies.map(c => ({ id: c.user_id, model: "Company", pushToken: c.pushToken }))
      ].filter(u => u.pushToken);

      const notifications = users.map(user => ({
        user: user.id,
        userModel: user.model,
        type: "new_mandi_ad",
        title: "🆕 New Mandi Ad!",
        message: `New ad "${mandiAdDoc.title}" for ₹${mandiAdDoc.price}`,
        data: {
          mandiAdId: mandiAdDoc._id,
          mandiId: mandi._id,
          title: mandiAdDoc.title,
          price: mandiAdDoc.price,
          mandi: mandiAdDoc.mandi
        },
        priority: "medium",
        pushToken: user.pushToken,
        locationData: {
          state: mandi.state,
          district: mandiAdDoc.district,
          mandi: mandiAdDoc.mandi,
        }
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        await Promise.all(notifications.map(n => sendPushNotification(n)));
        console.log(`✅ Created ${notifications.length} mandi ad notifications`);
      }
    } catch (error) {
      console.error("❌ Mandi ad notification error:", error);
    }
  }

  static async generateNewCommodityNotifications(commodityDoc) {
    try {
      console.log("🚀 Generating new commodity notifications...");
      
      const [listings, companies] = await Promise.all([
        Listing.find({ isActive: true, isVerified: true }).select("user_id pushToken").limit(200),
        Company.find({ isActive: true, isVerified: true }).select("user_id pushToken").limit(200)
      ]);

      const users = [
        ...listings.map(l => ({ id: l.user_id, model: "LISTING", pushToken: l.pushToken })),
        ...companies.map(c => ({ id: c.user_id, model: "Company", pushToken: c.pushToken }))
      ].filter(u => u.pushToken).slice(0, 200);

      const notifications = users.map(user => ({
        user: user.id,
        userModel: user.model,
        type: "new_commodity_add",
        title: "🆕 New Commodity Added!",
        message: `New commodity "${commodityDoc.name}" is now available.`,
        data: { commodityId: commodityDoc._id, name: commodityDoc.name },
        priority: "low",
        pushToken: user.pushToken
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        await Promise.all(notifications.map(n => sendPushNotification(n)));
        console.log(`✅ Created ${notifications.length} commodity notifications`);
      }
    } catch (error) {
      console.error("❌ Commodity notification error:", error);
    }
  }

  static async generateNewCategoryNotifications(categoryDoc) {
    try {
      console.log("🚀 Generating new category notifications...");
      
      const [listings, companies] = await Promise.all([
        Listing.find({ isActive: true, isVerified: true }).select("user_id pushToken").limit(200),
        Company.find({ isActive: true, isVerified: true }).select("user_id pushToken").limit(200)
      ]);

      const users = [
        ...listings.map(l => ({ id: l.user_id, model: "LISTING", pushToken: l.pushToken })),
        ...companies.map(c => ({ id: c.user_id, model: "Company", pushToken: c.pushToken }))
      ].filter(u => u.pushToken).slice(0, 200);

      const notifications = users.map(user => ({
        user: user.id,
        userModel: user.model,
        type: "new_category_add",
        title: "🆕 New Category Added!",
        message: `New category "${categoryDoc.name}" is now available.`,
        data: { categoryId: categoryDoc._id, name: categoryDoc.name },
        priority: "low",
        pushToken: user.pushToken
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        await Promise.all(notifications.map(n => sendPushNotification(n)));
        console.log(`✅ Created ${notifications.length} category notifications`);
      }
    } catch (error) {
      console.error("❌ Category notification error:", error);
    }
  }
}

module.exports = NotificationService;