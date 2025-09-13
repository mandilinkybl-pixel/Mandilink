const Mandi = require("../../models/mandilistmodel");
const State = require("../../models/stateSchema");
const SecureEmployee = require("../../models/adminEmployee");

// 🔹 Helper function: normalize mandi names
function formatName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // collapse extra spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // title case
}

class MandiController {
  // Show all mandis
 getMandis = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      req.flash("error_msg", "Unauthorized user");
      return res.redirect("/admin");
    }

    // 🔹 Update mandis that don't have user_id
    await Mandi.updateMany(
      { $or: [{ user_id: { $exists: false } }, { user_id: null }] },
      { $set: { user_id: user.id } }
    );

    // Fetch updated mandis
    const mandis = await Mandi.find()
      .populate("state")
      .sort({ createdAt: 1 });

    const states = await State.find();
    const userdetails = await SecureEmployee.findById(user.id);

    res.render("admin/mandi", {
      mandis,
      states,
      userdetails,
      user,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
    });
  } catch (err) {
    console.error("Error in getMandis:", err);
    req.flash("error_msg", "Error loading mandi list");
    res.redirect("/admin");
  }
};


  // Add multiple mandis (no duplicates, normalized names)
  addMandi = async (req, res) => {
    try {
      const { state, district, names } = req.body;
      let mandiDocs = [];

      for (let i = 0; i < names.length; i++) {
        let mandiName = names[i];
        if (!mandiName || !mandiName.trim()) continue;

        mandiName = formatName(mandiName);

        // Check duplicate
        const exists = await Mandi.findOne({
          state,
          district,
          user_id: req.user.id,
          name: mandiName,
        });

        if (!exists) {
          mandiDocs.push({
            state,
            district,
            user_id: req.user.id,
            name: mandiName,
          });
        }
      }

      if (mandiDocs.length > 0) {
        await Mandi.insertMany(mandiDocs);
        req.flash("success_msg", `${mandiDocs.length} Mandi(s) added successfully`);
      } else {
        req.flash("error_msg", "No new mandi added (duplicates or empty names)");
      }

      res.redirect("/admin/mandis");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error adding mandis");
      res.redirect("/admin/mandis");
    }
  };

  // Edit mandi (check duplicates, normalize name)
  editMandi = async (req, res) => {
    try {
      const { id } = req.params;
      let { state, district, name } = req.body;

      const mandi = await Mandi.findById(id);
      if (!mandi) {
        req.flash("error_msg", "Mandi not found");
        return res.redirect("/admin/mandis");
      }

      name = formatName(name);

      const duplicate = await Mandi.findOne({
        _id: { $ne: id },
        state,
        district,
        user_id: req.user.id,
        name,
      });

      if (duplicate) {
        req.flash("error_msg", "Mandi with this name already exists in selected district");
        return res.redirect("/admin/mandis");
      }

      mandi.state = state;
      mandi.district = district;
      mandi.user_id = req.user.id;
      mandi.name = name;

      await mandi.save();

      req.flash("success_msg", "Mandi updated successfully");
      res.redirect("/admin/mandis");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error updating mandi");
      res.redirect("/admin/mandis");
    }
  };

  // Delete single mandi
  deleteMandi = async (req, res) => {
    try {
      const { id } = req.params;
      await Mandi.findByIdAndDelete(id);
      req.flash("success_msg", "Mandi deleted successfully");
      res.redirect("/admin/mandis");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error deleting mandi");
      res.redirect("/admin/mandis");
    }
  };

  // Delete multiple mandis
  deleteManyMandis = async (req, res) => {
    try {
      const { ids } = req.body; // Expecting array of IDs
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        req.flash("error_msg", "No mandis selected for deletion");
        return res.redirect("/admin/mandis");
      }

      await Mandi.deleteMany({ _id: { $in: ids } });

      req.flash("success_msg", `${ids.length} Mandi(s) deleted successfully`);
      res.redirect("/admin/mandis");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error deleting selected mandis");
      res.redirect("/admin/mandis");
    }
  };

  // API for state -> districts
  getDistricts = async (req, res) => {
    try {
      const state = await State.findById(req.params.stateId);
      if (!state) return res.json([]);
      res.json(state.districts || []);
    } catch (err) {
      console.error(err);
      res.json([]);
    }
  };
}

module.exports = new MandiController();
