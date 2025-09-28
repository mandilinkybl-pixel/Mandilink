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

    // LISTING users with populated category, state, and mandi
    const listingUsers = await LISTING.find({ category: categoryId, isActive: true })
      .populate("category", "name")
      .populate("state", "name") // populate state name
      .populate("mandi", "name district") // populate mandi details
      .lean();

    // Company users with populated category, state, and mandi
    const companyUsers = await Company.find({ category: categoryId, isActive: true })
      .populate("category", "name")
      .populate("state", "name")
      .populate("mandi", "name district")
      .lean();

    // Merge all users
    const users = [...listingUsers, ...companyUsers];

    if (!users.length) {
      return res.status(404).json({ success: false, message: "No users found for this category" });
    }

    // Extract category name from the first user
    const categoryName = users[0]?.category?.name || "Unknown";

    // Format users with full details
    const formattedUsers = users.map(u => ({
      ...u,
      state: u.state?.name || "",
      district: u.district || "",
      mandi: u.mandi?.name || "",
    }));

    res.status(200).json({
      success: true,
      category: categoryName,
      total: users.length,
      users: formattedUsers,
    });

  } catch (error) {
    console.error("Error in getUsersByCategory:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}



}

module.exports = new UserController();
