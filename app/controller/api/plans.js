const Plan = require("../../models/plan");

class PlanController {
  // ✅ Get all plans
  async getAll(req, res) {
    try {
      const plans = await Plan.find().populate("categories");
      res.status(200).json({
        success: true,
        count: plans.length,
        data: plans,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ✅ Get plan by ID
  async getById(req, res) {
    try {
      const plan = await Plan.findById(req.params.id).populate("categories");

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

// Export an instance of the controller
module.exports = new PlanController();
