const Mandi = require("../../models/mandilistmodel");
const State = require("../../models/stateSchema");

class MandiController {
  /**
   * GET /api/mandis
   * - If no query → return all mandis
   * - If stateId provided → return mandis in that state
   * - If district provided → return mandis in that district
   */
  async getMandis(req, res) {
    try {
      const { stateId, district } = req.query;

      const filter = {};
      if (stateId) filter.state = stateId;
      if (district) filter.district = district;

      const mandis = await Mandi.find(filter)
        .populate("state", "name")
        .lean();

      if (!mandis.length) {
        return res.status(404).json({ success: false, message: "No mandis found" });
      }

      res.status(200).json({
        success: true,
        total: mandis.length,
        mandis: mandis.map(m => ({
          id: m._id,
          name: m.name,
          state: m.state?.name || "",
          district: m.district,
        })),
      });
    } catch (error) {
      console.error("Error in getMandis:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

module.exports = new MandiController();
