// hooks/modelHooks.js
const NotificationService = require("../service/notificationservice");

const applyNotificationHooks = () => {
  const Mandi = require("../models/mandilistmodel");
  
  // Mandi Hook
  Mandi.schema.post("save", async function(doc) {
    if (this.isNew && doc.isActive) {
      console.log(`🆕 New mandi created: ${doc.name}`);
      await NotificationService.generateNewMandiNotifications(doc);
    }
  });

  // MandiRate Hook
  const MandiRate = require("../models/dealymandiRateuapdate");
  if (MandiRate && MandiRate.schema) {
    MandiRate.schema.post("save", function(doc) {
      if (this.isModified("rates") && doc.rates?.length > 0) {
        if (this._notificationTimeout) clearTimeout(this._notificationTimeout);
        this._notificationTimeout = setTimeout(() => {
          NotificationService.generateMandiRateNotifications(doc);
        }, 10000);
      }
    });
  }

  // MandiAd Hook
  const MandiAd = require("../models/mandilistmodel");
  if (MandiAd && MandiAd.schema) {
    MandiAd.schema.post("save", async function(doc) {
      if (this.isNew && doc.isActive) {
        await NotificationService.generateNewMandiAdNotifications(doc);
      }
    });
  }

  // Commodity Hook
  const Commodity = require("../models/commodityname");
  if (Commodity && Commodity.schema) {
    Commodity.schema.post("save", async function(doc) {
      if (this.isNew && doc.status === "active") {
        await NotificationService.generateNewCommodityNotifications(doc);
      }
    });
  }

  // Category Hook
  const Category = require("../models/category.model");
  if (Category && Category.schema) {
    Category.schema.post("save", async function(doc) {
      if (this.isNew && doc.status === "active") {
        await NotificationService.generateNewCategoryNotifications(doc);
      }
    });
  }

  console.log("✅ Notification hooks applied successfully");
};

module.exports = { applyNotificationHooks };