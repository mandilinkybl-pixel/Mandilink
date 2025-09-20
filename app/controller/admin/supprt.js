// controllers/admin/SupportController.js
const Support = require("../../models/support");
const Company = require("../../models/companylisting");
const User = require("../../models/lisingSchema"); // user model
const SecureEmployee = require("../../models/adminEmployee");

class SupportController {
  // Create a complaint (admin, user, or company)
  async create(req, res) {
    try {
      const { subject, message, category, priority, originType, companyId, userId } = req.body;
      const ticketNumber = `TCK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = { subject, message, category: category || "other", priority: priority || "medium", ticketNumber };

      if (originType === "company") {
        const cid = companyId || (req.company && req.company._id);
        if (!cid) return req.flash?.("error_msg", "Company ID required"), res.redirect("/admin/support/all");
        payload.company = cid;
      } else if (originType === "user") {
        let uid = userId || req.user?._id;
        if (!uid) {
          const testUser = await User.findOne();
          if (!testUser) return req.flash?.("error_msg", "User ID required"), res.redirect("/admin/support/all");
          uid = testUser._id;
        }
        payload.user = uid;
      } else {
        payload.user = req.user?._id;
      }

      const support = new Support(payload);
      await support.save();
      req.flash?.("success_msg", `Complaint created. Ticket: ${support.ticketNumber}`);
      return res.redirect("/admin/support/all");
    } catch (err) {
      console.error("Support create error:", err);
      req.flash?.("error_msg", "Failed to create complaint");
      return res.redirect("/admin/support/all");
    }
  }

  // Master list
  async getAll(req, res) {
    try {
      const { q, startDate, endDate, status } = req.query;
      const filter = {};
      if (q) filter.$or = [
        { ticketNumber: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { priority: { $regex: q, $options: "i" } },
        { status: { $regex: q, $options: "i" } },
      ];
      if (status) filter.status = status;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) { const d = new Date(endDate); d.setHours(23, 59, 59, 999); filter.createdAt.$lte = d; }
      }

      const complaints = await Support.find(filter)
        .populate("user", "name email contactNumber")
        .populate("company", "name email contactNumber")
        .populate({ path: "conversation.sender", select: "name email" })
        .sort({ createdAt: -1 });

      const user = req.user;
      const userdetails = await SecureEmployee.findById(req.user.id);

      return res.render("admin/allComplaints", { user, userdetails, complaints, q: q||"", startDate: startDate||"", endDate: endDate||"", status: status||"", success_msg: req.flash?.("success_msg"), error_msg: req.flash?.("error_msg") ,});
    } catch (err) {
      console.error("getAll error:", err);
      return res.status(500).send("Server error");
    }
  }

  // User complaints
  async getUsers(req, res) {
    try {
      const { q, startDate, endDate, status } = req.query;
      const filter = { user: { $ne: null } };
      if (q) filter.$or = [
        { ticketNumber: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
      ];
      if (status) filter.status = status;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) { const d = new Date(endDate); d.setHours(23, 59, 59, 999); filter.createdAt.$lte = d; }
      }

      const complaints = await Support.find(filter)
        .populate("user", "name email contactNumber")
        .sort({ createdAt: -1 });

      const user = req.user;
      const userdetails = await SecureEmployee.findById(req.user.id);

      return res.render("admin/usersComplaints", { complaints, q:q||"", startDate:startDate||"", endDate:endDate||"", status:status||"", user, userdetails, success_msg:req.flash?.("success_msg"), error_msg:req.flash?.("error_msg") });
    } catch(err) {
      console.error("getUsers error:", err);
      return res.status(500).send("Server error");
    }
  }

  // Company complaints
  async getCompanies(req, res) {
    try {
      const { q, startDate, endDate, status } = req.query;
      const filter = { company: { $ne: null } };
      if (q) filter.$or = [
        { ticketNumber: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
      ];
      if (status) filter.status = status;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) { const d = new Date(endDate); d.setHours(23, 59, 59, 999); filter.createdAt.$lte = d; }
      }

      const complaints = await Support.find(filter)
        .populate("company", "name email contactNumber")
        .sort({ createdAt: -1 });

      const user = req.user;
      const userdetails = await SecureEmployee.findById(req.user.id);

      return res.render("admin/companiesComplaints", { complaints, q:q||"", startDate:startDate||"", endDate:endDate||"", status:status||"", user, userdetails, success_msg:req.flash?.("success_msg"), error_msg:req.flash?.("error_msg") });
    } catch(err) {
      console.error("getCompanies error:", err);
      return res.status(500).send("Server error");
    }
  }

  // Successful complaints
  async getSuccessful(req, res) {
    try {
      const complaints = await Support.find({ status: { $in: ["resolved", "closed"] } })
        .populate("user", "name email contactNumber")
        .populate("company", "name email contactNumber")
        .sort({ createdAt: -1 });

      const user = req.user;
      const userdetails = await SecureEmployee.findById(req.user.id);

      return res.render("admin/successfulComplaints", { complaints, user, userdetails, success_msg:req.flash?.("success_msg"), error_msg:req.flash?.("error_msg") });
    } catch(err) {
      console.error("getSuccessful error:", err);
      return res.status(500).send("Server error");
    }
  }

  // Unsuccessful complaints
  async getUnsuccessful(req, res) {
    try {
      const complaints = await Support.find({ status: { $in: ["open", "in-progress"] } })
        .populate("user", "name email contactNumber")
        .populate("company", "name email contactNumber")
        .sort({ createdAt: -1 });

      const user = req.user;
      const userdetails = await SecureEmployee.findById(req.user.id);

      return res.render("admin/unsuccessfulComplaints", { complaints, user, userdetails, success_msg:req.flash?.("success_msg"), error_msg:req.flash?.("error_msg") });
    } catch(err) {
      console.error("getUnsuccessful error:", err);
      return res.status(500).send("Server error");
    }
  }

  // View single complaint + conversation
  async view(req, res) {
    try {
      const { id } = req.params;
      const complaint = await Support.findById(id)
        .populate("user", "name email contactNumber")
        .populate("company", "name email contactNumber")
        .populate({ path: "conversation.sender", select: "name email" });

      if (!complaint) return req.flash?.("error_msg", "Complaint not found"), res.redirect("/admin/support/all");

      const user = req.user;
      const userdetails = await SecureEmployee.findById(req.user.id);

      return res.render("admin/viewComplaint", { complaint, user, userdetails, success_msg:req.flash?.("success_msg"), error_msg:req.flash?.("error_msg") });
    } catch (err) {
      console.error("view error:", err);
      return res.status(500).send("Server error");
    }
  }

  // Add message to conversation
  async addMessage(req, res) {
    try {
      const { id } = req.params;
      const { message, senderType } = req.body;
      const complaint = await Support.findById(id);
      if (!complaint) return req.flash?.("error_msg", "Complaint not found"), res.redirect("/admin/support/all");

      let senderId, senderRef;
      if (senderType === "admin") {
        const admin = await SecureEmployee.findById(req.user?._id);
        if (!admin) return req.flash?.("error_msg", "Admin not found"), res.redirect("/admin/support/all");
        senderId = admin._id; senderRef = "SecureEmployee";
      } else if (senderType === "user") { senderId = req.user?._id || req.body.senderId; senderRef = "LISTING"; }
      else if (senderType === "company") { senderId = req.user?._id || req.body.senderId; senderRef = "Company"; }
      else return req.flash?.("error_msg", "Invalid sender type"), res.redirect("/admin/support/all");

      complaint.conversation.push({ senderType, sender: senderId, senderRef, message, createdAt: new Date() });
      if (senderType === "admin" && complaint.status === "open") complaint.status = "in-progress";

      await complaint.save();
      req.flash?.("success_msg", "Message added");
      return res.redirect(`/admin/support/view/${id}`);
    } catch (err) {
      console.error("addMessage error:", err);
      req.flash?.("error_msg", "Failed to add message");
      return res.redirect("/admin/support/all");
    }
  }

  // Update complaint status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await Support.findByIdAndUpdate(id, { status });
      req.flash?.("success_msg", "Status updated");
      return res.redirect(`/admin/support/view/${id}`);
    } catch (err) {
      console.error("updateStatus error:", err);
      req.flash?.("error_msg", "Failed to update status");
      return res.redirect("/admin/support/all");
    }
  }

  // Delete complaint
  async delete(req, res) {
    try {
      const { id } = req.params;
      await Support.findByIdAndDelete(id);
      req.flash?.("success_msg", "Complaint deleted");
      return res.redirect("/admin/support/all");
    } catch (err) {
      console.error("delete error:", err);
      req.flash?.("error_msg", "Failed to delete complaint");
      return res.redirect("/admin/support/all");
    }
  }
}

module.exports = new SupportController();
