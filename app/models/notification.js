const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    states: [{ type: mongoose.Schema.Types.ObjectId, ref: "State" }],
    districts: [{ type: String }],
    mandis: [{ type: String }],

    target: { type: String, enum: ["all", "custom"], default: "custom" },

    sentToUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "LISTING" }],
    sentToCompanies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
