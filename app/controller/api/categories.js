const Category = require("../../models/category.model");

class CategoryController {
  /**
   * GET /api/categories
   * Get all categories
   */
  async getAllCategories(req, res) {
    try {
      const categories = await Category.find().sort({ name: 1 }).lean();

      if (!categories.length) {
        return res.status(404).json({ success: false, message: "No categories found" });
      }

      res.status(200).json({
        success: true,
        total: categories.length,
        categories: categories.map(c => ({
          id: c._id,
          name: c.name,
          status: c.status,
        })),
      });
    } catch (error) {
      console.error("Error in getAllCategories:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

module.exports = new CategoryController();
