const Notification = require("../../models/notification");
const Company = require("../../models/companylisting");
const Listing = require("../../models/lisingSchema");
const Category = require("../../models/category.model");
const State = require("../../models/stateSchema");
const Mandi = require("../../models/mandilistmodel");
const SecureEmployee = require("../../models/adminEmployee");
const mongoose = require("mongoose");
const axios = require("axios");

const FCM_API_KEY = process.env.FIREBASEAPI_KEY;

class NotificationController {

  // Show notification form
  async showForm(req, res) {
    try {
      const categories = await Category.find();
      const states = await State.find();
      const user = req.user;
      const userdetails = await SecureEmployee.findById(req.user.id);
      const sent_users = req.session.sent_users || [];

      res.render("admin/notifications", {
        categories,
        states,
        user,
        userdetails,
        sent_users,
        success_msg: req.session.success_msg,
        error_msg: req.session.error_msg,
      });

      req.session.success_msg = null;
      req.session.error_msg = null;
      req.session.sent_users = null;

    } catch (err) {
      console.error(err);
      req.session.error_msg = "Error loading form.";
      res.redirect("/admin/notifications");
    }
  }

  // Send notification
  async sendNotification(req, res) {
    try {
      const { title, body, category, target } = req.body;
      let { states, districts, mandis } = req.body;

      if (!Array.isArray(states)) states = states ? [states] : [];
      if (!Array.isArray(districts)) districts = districts ? [districts] : [];
      if (!Array.isArray(mandis)) mandis = mandis ? [mandis] : [];

      states = states.map(s =>new mongoose.Types.ObjectId(s));

      const filter = {};
      if (target !== "all") {
        if (category && category !== "all") filter.category = category;
        if (states.length) filter.state = { $in: states };
        if (districts.length) filter.district = { $in: districts };
        if (mandis.length) filter.mandi = { $in: mandis };
      }

      const users = await Listing.find(filter);
      const companies = await Company.find(filter);

      const fcmTokens = [
        ...users.map(u => u.pushToken).filter(Boolean),
        ...companies.map(c => c.pushToken).filter(Boolean),
      ];

      if (!fcmTokens.length) {
        req.session.error_msg = "No users/companies found with push tokens.";
        return res.redirect("/admin/notifications");
      }

      await axios.post("https://fcm.googleapis.com/fcm/send", {
        registration_ids: fcmTokens,
        notification: { title, body },
      }, {
        headers: { Authorization: `key=${FCM_API_KEY}`, "Content-Type": "application/json" },
      });

      await Notification.create({
        title,
        message: body,
        category: category !== "all" ? category : null,
        states,
        districts,
        mandis,
        target,
        sentToUsers: users.map(u => u._id),
        sentToCompanies: companies.map(c => c._id),
      });

      req.session.success_msg = `Sent to ${users.length} users & ${companies.length} companies.`;
      req.session.sent_users = [...users, ...companies];
      res.redirect("/admin/notifications");

    } catch (err) {
      console.log("Notification send error:", err);
      console.error(err.response?.data || err.message);
      req.session.error_msg = "Failed to send notification.";
      res.redirect("/admin/notifications");
    }
  }

  // AJAX: get districts by state IDs
  async getDistricts(req, res) {
    try {
      const stateIds = req.query.ids.split(",").map(id => new mongoose.Types.ObjectId(id));
      const states = await State.find({ _id: { $in: stateIds } });
      const districts = states.flatMap(s => s.districts);
      res.json(districts);
    } catch (err) {
      console.error(err);
      res.status(500).json([]);
    }
  }

  // AJAX: get mandis by states + districts
  async getMandis(req, res) {
    try {
      const stateIds = req.query.states.split(",").map(id =>new mongoose.Types.ObjectId(id));
      const districts = req.query.districts.split(",");

      const mandis = await Mandi.find({
        state: { $in: stateIds },
        district: { $in: districts }
      });

      res.json(mandis.map(m => m.name));
    } catch (err) {
      console.error(err);
      res.status(500).json([]);
    }
  }

}

module.exports = new NotificationController();
