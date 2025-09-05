const State = require("../../models/stateSchema");
const SecureEmployee = require("../../models/adminEmployee");

class StateController {
  // List all states
  getStates = async (req, res) => {
    try {
      const user = req.user;
      const userdetails = await SecureEmployee.findById(user.id);
      const states = await State.find().sort({ createdAt: -1 });
      res.render("admin/state", {
        states,
        userdetails,
        user,
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (err) {
      req.flash("error_msg", "Error fetching states");
      res.redirect("/admin/state");
    }
  };

  // Add State
  addState = async (req, res) => {
    try {
      const { name, districts } = req.body;
      // districts can be array or comma-separated string
      let districtArray;
      if (Array.isArray(districts)) {
        districtArray = districts.map(d => d.trim()).filter(Boolean);
      } else if (typeof districts === "string") {
        districtArray = districts.split(",").map(d => d.trim()).filter(Boolean);
      } else {
        districtArray = [];
      }

      const existing = await State.findOne({ name: name.trim() });
      if (existing) {
        req.flash("error_msg", "State already exists");
        return res.redirect("/admin/state");
      }

      const state = new State({ name: name.trim(), districts: districtArray });
      await state.save();

      req.flash("success_msg", "State added successfully");
      res.redirect("/admin/state");
    } catch (err) {
      console.log(err);
      req.flash("error_msg", "Error adding state");
      res.redirect("/admin/state");
    }
  };

  // Update State
  updateState = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, districts } = req.body;

      let districtList;
      if (Array.isArray(districts)) {
        districtList = districts.map(d => d.trim()).filter(Boolean);
      } else if (typeof districts === "string") {
        districtList = districts.split(",").map(d => d.trim()).filter(Boolean);
      } else {
        districtList = [];
      }

      const state = await State.findByIdAndUpdate(
        id,
        { name: name.trim(), districts: districtList },
        { new: true, runValidators: true }
      );

      if (!state) {
        req.flash("error_msg", "State not found");
        return res.redirect("/admin/state");
      }

      req.flash("success_msg", "State updated successfully");
      res.redirect("/admin/state");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error updating state");
      res.redirect("/admin/state");
    }
  };

  // Delete State
  deleteState = async (req, res) => {
    try {
      const { id } = req.params;
      const state = await State.findByIdAndDelete(id);

      if (!state) {
        req.flash("error_msg", "State not found");
        return res.redirect("/admin/state");
      }

      req.flash("success_msg", "State deleted successfully");
      res.redirect("/admin/state");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error deleting state");
      res.redirect("/admin/state");
    }
  };
}

module.exports = new StateController();