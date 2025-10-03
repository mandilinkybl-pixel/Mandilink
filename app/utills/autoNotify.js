// utils/autoNotify.js
const { createNotification } = require("../message/message");

const defaultTypeMap = {
  Bid: "bid",
  Job: "job",
  Mandi: "mandi",
  MandiRate: "mandirate",
  Listing: "listing",
  Company: "company",
  BlogPost: "blog",
  Commodity: "commodity",
  PurchasePlan: "purchaseplan",
};

const autoNotify = (model) => {
  const type = defaultTypeMap[model.modelName] || "general";

  model.schema.post("save", async function (doc) {
    try {
      if (!doc.isNew) return; // only new docs
      const state = doc.state || null;
      const district = doc.district || null;

      await createNotification({
        type,
        relatedId: doc._id,
        state,
        district,
        data: doc,
      });

      console.log(`Notification auto-created for ${type} - ${doc._id}`);
    } catch (err) {
      console.error("Auto notification error:", err.message);
    }
  });
};

module.exports = autoNotify;
