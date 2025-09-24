const Plan = require("../../models/plan");


class PlanController {
  // Get all plans
  async getAllPlans(req, res) {
    try {
      const plans = await Plan.find().populate("categories", "name");
      res.json({ success: true, data: plans });
    } catch (err) {
      console.error("Error fetching plans:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Get plan by ID
  async getPlanById(req, res) {
    try {
      const { id } = req.params;
      const plan = await Plan.findById(id).populate("categories", "name");

      if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

      res.json({ success: true, data: plan });
    } catch (err) {
      console.error("Error fetching plan by ID:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}
// Export an instance of the controller
module.exports = new PlanController();
