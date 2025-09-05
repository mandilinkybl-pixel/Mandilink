// controllers/employees/commodities.controller.js
const SecureEmployee = require("../../models/adminEmployee");
const Commodity = require("../../models/commodityname");

class CommodityController {
  // Show list page
  getAllCommodities = async (req, res) => {
    try {
      const user = req.user;
      const userdetails = await SecureEmployee.findById(user.id);
      const commodities = await Commodity.find().sort({ createdAt: -1 });
      const employee = await SecureEmployee.findById(user.id);
      res.render("employees/comidities", {
        commodities,
        userdetails,
        user,
        employee,
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error fetching commodities");
      res.redirect("/employees/commodities");
    }
  };

  // Add
  addCommodity = async (req, res) => {
  try {
    const { name, status } = req.body;

    // 🔥 Case-insensitive & trim check
    const existing = await Commodity.findOne({
      name: { $regex: new RegExp("^" + name.trim() + "$", "i") }
    });

    if (existing) {
      req.flash("error_msg", "Commodity already exists");
      return res.redirect("/employees/commodities"); // ensure route matches
    }

    const commodity = new Commodity({ name: name.trim(), status });
    await commodity.save();

    req.flash("success_msg", "Commodity added successfully");
    res.redirect("/employees/commodities");
  } catch (err) {
    console.error("Add Commodity Error:", err);
    req.flash("error_msg", "Error adding commodity");
    res.redirect("/employees/commodities");
  }
};


  // Update
  updateCommodity = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, status } = req.body;

      const commodity = await Commodity.findByIdAndUpdate(
        id,
        { name, status },
        { new: true, runValidators: true }
      );

      if (!commodity) {
        req.flash("error_msg", "Commodity not found");
        return res.redirect("/employees/commodities");
      }

      req.flash("success_msg", "Commodity updated successfully");
      res.redirect("/employees/commodities");
    } catch (err) {
      req.flash("error_msg", "Error updating commodity");
      res.redirect("/employees/commodities");
    }
  };

  // Delete
  deleteCommodity = async (req, res) => {
    try {
      const { id } = req.params;

      const commodity = await Commodity.findByIdAndDelete(id);
      if (!commodity) {
        req.flash("error_msg", "Commodity not found");
        return res.redirect("/employees/commodities");
      }

      req.flash("success_msg", "Commodity deleted successfully");
      res.redirect("/employees/commodities");
    } catch (err) {
      req.flash("error_msg", "Error deleting commodity");
      res.redirect("/employees/commodities");
    }
  };
}

module.exports = new CommodityController();
