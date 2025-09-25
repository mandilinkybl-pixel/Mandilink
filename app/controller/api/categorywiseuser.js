const LISTING = require("../../models/lisingSchema");
const Company = require("../../models/companylisting");

class UserController {
  /**
   * GET /api/users/category/:categoryId
   * Find users (Listing + Company) by category
   */
  async getUsersByCategory(req, res) {
    try {
      const { categoryId } = req.params;

      if (!categoryId) {
        return res.status(400).json({ success: false, message: "categoryId is required" });
      }

      // Find in LISTING
      const listingUsers = await LISTING.find({ category: categoryId, isActive: true })
        .select("name address state district mandi email contactNumber role")
        .lean();

      // Find in Company
      const companyUsers = await Company.find({ category: categoryId, isActive: true })
        .select("name address state district mandi contactPerson contactNumber email role")
        .lean();

      // Merge results
      const users = [...listingUsers, ...companyUsers];

      if (!users.length) {
        return res.status(404).json({ success: false, message: "No users found for this category" });
      }

      res.status(200).json({
        success: true,
        total: users.length,
        users,
      });
    } catch (error) {
      console.error("Error in getUsersByCategory:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

module.exports = new UserController();
