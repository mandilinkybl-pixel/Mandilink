const SecureEmployee = require("../../models/adminEmployee");
const Company = require("../../models/companylisting");

class BlockUnblockCompanyController {
  // ✅ Get all companies
 getalllist  = async (req, res) => {
  try {
    // ✅ Add missing default fields in all companies
    await Company.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );

    await Company.updateMany(
      { isVerified: { $exists: false } },
      { $set: { isVerified: false } }
    );

    // ✅ Fetch only active companies
    const companies = await Company.find({ isActive: true })
      .populate("user_id", "name email")   // SecureEmployee details
      .populate("category", "name")        // Category name
      .populate("state", "name districts") // State details
      .lean();

    // ✅ Current logged-in user
    const userdetails = await SecureEmployee.findById(req.user.id);

    // ✅ Render to EJS
    return res.render("admin/allcompany", {
      companies,
      user: req.user,
      userdetails,
      authUser: req.user,
    });
  } catch (err) {
    console.error("Error fetching companies:", err);
    req.flash("error_msg", "Error loading company list");
    return res.redirect("/admin/blockedcompany");
  }
};
blocksUser = async (req, res) => {
  try{
    const userdetails = await SecureEmployee.findById(req.user.id);
    const companies = await Company.find({ isActive: false })
    .populate("user_id", "name email")
    .populate("category", "name")
    .populate("state", "name districts");
    return res.render("admin/blockedcompanys", {
      companies,
      user: req.user,
      userdetails,
      authUser: req.user,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error loading blocked companies");
    return res.redirect("/admin/blockunblockcompany");
  }
};

  // ✅ Block a company
  blockCompany = async (req, res) => {
    try {
      await Company.findByIdAndUpdate(req.params.id, { isActive: false });
      req.flash("success_msg", "Company has been blocked successfully");
      return res.redirect("/admin/blockunblockcompany");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error blocking company");
      return res.redirect("/admin/blockunblockcompany");
    }
  };

  // ✅ Unblock a company
  unblockCompany = async (req, res) => {
    try {
      await Company.findByIdAndUpdate(req.params.id, { isActive: true });
      req.flash("success_msg", "Company has been unblocked successfully");
      return res.redirect("/admin/blockunblockcompany");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error unblocking company");
      return res.redirect("/admin/blockunblockcompany");
    }
  };
}

module.exports = new BlockUnblockCompanyController();
