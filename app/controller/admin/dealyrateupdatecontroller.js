const MandiRate = require("../../models/dealymandiRateuapdate");
const State = require("../../models/stateSchema");
const Mandi = require("../../models/mandilistmodel");
const Commodity = require("../../models/commodityname");
const SecureEmployee = require("../../models/adminEmployee");
const mongoose = require("mongoose");
const { Parser } = require("json2csv"); // CSV
const ExcelJS = require("exceljs"); // Excel
const PDFDocument = require("pdfkit-table"); // PDF
const cron = require("node-cron");

/**
 * Controller for managing Mandi Rates
 */
class MandiRateController {
  constructor() {
    this.setupCron();
  }

  /**
   * Setup cron job to delete mandi rates older than 30 days
   */
  setupCron() {
    cron.schedule("0 0 * * *", async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        await MandiRate.deleteMany({ updatedAt: { $lt: thirtyDaysAgo } });
        console.log("Deleted mandi rates older than 30 days");
      } catch (err) {
        console.error("Error in cron job for deleting old mandi rates:", err);
      }
    });
  }

  /**
   * Utility: validate numeric fields
   */
  validateRateInput(min, max, arrival, index) {
    const minPrice = Number(min);
    const maxPrice = Number(max);
    const estArrival = arrival !== undefined && arrival !== null && arrival !== "" ? Number(arrival) : null;

    if (isNaN(minPrice) || isNaN(maxPrice) || minPrice < 0 || maxPrice < 0) {
      throw new Error(`Invalid price values for commodity at index ${index}`);
    }
    if (minPrice > maxPrice) {
      throw new Error(`Minimum price cannot be greater than maximum price at index ${index}`);
    }
    if (estArrival !== null && (isNaN(estArrival) || estArrival < 0)) {
      throw new Error(`Invalid estimated arrival for commodity at index ${index}`);
    }

    return { minPrice, maxPrice, estArrival };
  }

  /**
   * Render the Mandi Rates page with filters
   */
  getRatesPage = async (req, res) => {
    try {
      const user = req.user;
      if (!user || !mongoose.isValidObjectId(user.id)) {
        req.flash("error_msg", "Invalid user session");
        return res.redirect("/admin/login");
      }

      const userdetails = await SecureEmployee.findById(user.id).lean();
      if (!userdetails) {
        req.flash("error_msg", "User not found");
        return res.redirect("/admin/login");
      }

      const states = await State.find().sort({ name: 1 }).lean();
      const commodities = await Commodity.find().sort({ name: 1 }).lean();

      const { state, district, mandi } = req.query || {};
      let query = { user_id: user.id };
      if (state && mongoose.isValidObjectId(state)) query.state = state;
      if (district) query.district = district.trim();
      if (mandi && mongoose.isValidObjectId(mandi)) query.mandi = mandi;

      const rates = await MandiRate.find(query)
        .populate("state", "name")
        .populate("mandi", "name state")
        .populate("rates.commodity", "name")
        .sort({ "mandi.name": 1 })
        .lean();

      res.render("admin/mandirate", {
        user,
        userdetails,
        states,
        commodities,
        rates,
        selectedState: state || "",
        selectedDistrict: district || "",
        selectedMandi: mandi || "",
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (err) {
      console.error("Error in getRatesPage:", err);
      req.flash("error_msg", "Error loading Mandi Rates page");
      res.redirect("/admin/mandirate");
    }
  };

  /**
   * Add or update rates for a mandi
   */
  addOrUpdateRates = async (req, res) => {
    try {
      const user = req.user;
      if (!user || !mongoose.isValidObjectId(user.id)) {
        req.flash("error_msg", "Unauthorized user");
        return res.redirect("/admin/mandirate");
      }

      const { state, district, mandi, commodity_ids, minimums, maximums, arrivals } = req.body;
      if (!state || !district || !mandi || !commodity_ids) {
        req.flash("error_msg", "Please fill all required fields");
        return res.redirect("/admin/mandirate");
      }

      const commoditiesArr = Array.isArray(commodity_ids) ? commodity_ids : [commodity_ids];
      const minsArr = Array.isArray(minimums) ? minimums : [minimums];
      const maxArr = Array.isArray(maximums) ? maximums : [maximums];
      const arrArr = Array.isArray(arrivals) ? arrivals : [arrivals];

      if (commoditiesArr.length !== minsArr.length || commoditiesArr.length !== maxArr.length || commoditiesArr.length !== arrArr.length) {
        req.flash("error_msg", "Mismatched input arrays");
        return res.redirect("/admin/mandirate");
      }

      if (!mongoose.isValidObjectId(state) || !mongoose.isValidObjectId(mandi)) {
        req.flash("error_msg", "Invalid state or mandi ID");
        return res.redirect("/admin/mandirate");
      }

      const [stateExists, mandiExists] = await Promise.all([
        State.findById(state),
        Mandi.findOne({ _id: mandi, user_id: user.id }),
      ]);
      if (!stateExists) {
        req.flash("error_msg", "State not found");
        return res.redirect("/admin/mandirate");
      }
      if (!mandiExists) {
        req.flash("error_msg", "Mandi not found or not authorized");
        return res.redirect("/admin/mandirate");
      }

      const commodityIds = commoditiesArr.filter(id => mongoose.isValidObjectId(id));
      const commodities = await Commodity.find({ _id: { $in: commodityIds } });
      if (commodities.length !== commodityIds.length) {
        req.flash("error_msg", "One or more commodities not found");
        return res.redirect("/admin/mandirate");
      }

      let mandiRate = await MandiRate.findOne({ state, district, mandi, user_id: user.id });
      if (!mandiRate) {
        mandiRate = new MandiRate({ state, district, mandi, user_id: user.id, rates: [] });
      }

      for (let i = 0; i < commoditiesArr.length; i++) {
        if (!mongoose.isValidObjectId(commoditiesArr[i])) continue;

        let { minPrice, maxPrice, estArrival } = this.validateRateInput(minsArr[i], maxArr[i], arrArr[i], i);

        const existing = mandiRate.rates.find(r => String(r.commodity) === String(commoditiesArr[i]));
        if (existing) {
          existing.minimum = minPrice;
          existing.maximum = maxPrice;
          existing.estimatedArrival = estArrival;
          existing.updatedAt = new Date();
        } else {
          mandiRate.rates.push({
            commodity: commoditiesArr[i],
            minimum: minPrice,
            maximum: maxPrice,
            estimatedArrival: estArrival,
            updatedAt: new Date(),
          });
        }
      }

      mandiRate.updatedAt = new Date();
      await mandiRate.save();

      req.flash("success_msg", "Mandi rates updated successfully");
      res.redirect("/admin/mandirate");
    } catch (err) {
      console.error("Error in addOrUpdateRates:", err);
      req.flash("error_msg", err.message || "Error saving mandi rates");
      res.redirect("/admin/mandirate");
    }
  };

  /**
   * Add multiple commodities (merge/update instead of blocking)
   */
  addMultipleCommodities = async (req, res) => {
    const { mandiRateId } = req.params;
    const { commodity_ids, minimums, maximums, arrivals } = req.body;

    try {
      const user = req.user;
      if (!user || !mongoose.isValidObjectId(user.id)) {
        req.flash("error_msg", "Unauthorized user");
        return res.redirect("/admin/mandirate");
      }

      if (!mongoose.isValidObjectId(mandiRateId)) {
        req.flash("error_msg", "Invalid Mandi Rate ID");
        return res.redirect("/admin/mandirate");
      }

      const commoditiesArr = Array.isArray(commodity_ids) ? commodity_ids : [commodity_ids];
      const minsArr = Array.isArray(minimums) ? minimums : [minimums];
      const maxArr = Array.isArray(maximums) ? maximums : [maximums];
      const arrArr = Array.isArray(arrivals) ? arrivals : [arrivals];

      if (commoditiesArr.length !== minsArr.length || commoditiesArr.length !== maxArr.length || commoditiesArr.length !== arrArr.length) {
        req.flash("error_msg", "Mismatched input arrays");
        return res.redirect("/admin/mandirate");
      }

      const mandiRate = await MandiRate.findOne({ _id: mandiRateId, user_id: user.id });
      if (!mandiRate) {
        req.flash("error_msg", "Mandi Rate not found or not authorized");
        return res.redirect("/admin/mandirate");
      }

      const commodityIds = commoditiesArr.filter(id => mongoose.isValidObjectId(id));
      const commodities = await Commodity.find({ _id: { $in: commodityIds } });
      if (commodities.length !== commodityIds.length) {
        req.flash("error_msg", "One or more commodities not found");
        return res.redirect("/admin/mandirate");
      }

      for (let i = 0; i < commoditiesArr.length; i++) {
        if (!mongoose.isValidObjectId(commoditiesArr[i])) continue;

        let { minPrice, maxPrice, estArrival } = this.validateRateInput(minsArr[i], maxArr[i], arrArr[i], i);

        const existing = mandiRate.rates.find(r => String(r.commodity) === String(commoditiesArr[i]));
        if (existing) {
          existing.minimum = minPrice;
          existing.maximum = maxPrice;
          existing.estimatedArrival = estArrival;
          existing.updatedAt = new Date();
        } else {
          mandiRate.rates.push({
            commodity: commoditiesArr[i],
            minimum: minPrice,
            maximum: maxPrice,
            estimatedArrival: estArrival,
            updatedAt: new Date(),
          });
        }
      }

      await mandiRate.save();
      req.flash("success_msg", "Commodities added/updated successfully");
      res.redirect("/admin/mandirate");
    } catch (err) {
      console.error("Error in addMultipleCommodities:", err);
      req.flash("error_msg", err.message || "Error adding commodities");
      res.redirect("/admin/mandirate");
    }
  };

  /**
   * Edit a single commodity rate for a mandi
   */
  editCommodity = async (req, res) => {
    const { mandiRateId, commodityId } = req.params;
    const { minimum, maximum, estimatedArrival } = req.body;

    try {
      const user = req.user;
      if (!user || !mongoose.isValidObjectId(user.id)) {
        return res.status(401).json({ error: "Unauthorized user" });
      }

      if (!mongoose.isValidObjectId(mandiRateId) || !mongoose.isValidObjectId(commodityId)) {
        return res.status(400).json({ error: "Invalid Mandi Rate ID or Commodity ID" });
      }

      if (minimum === undefined || maximum === undefined) {
        return res.status(400).json({ error: "Minimum and Maximum prices are required" });
      }

      const minPrice = Number(minimum);
      const maxPrice = Number(maximum);
      const estArrival = estimatedArrival !== undefined ? Number(estimatedArrival) : null;

      if (isNaN(minPrice) || isNaN(maxPrice) || minPrice < 0 || maxPrice < 0) {
        return res.status(400).json({ error: "Minimum and Maximum prices must be non-negative numbers" });
      }

      if (minPrice > maxPrice) {
        return res.status(400).json({ error: "Minimum price cannot be greater than Maximum price" });
      }

      if (estArrival !== null && (isNaN(estArrival) || estArrival < 0)) {
        return res.status(400).json({ error: "Estimated arrival must be a non-negative number or null" });
      }

      const mandiRate = await MandiRate.findOne({ _id: mandiRateId, user_id: user.id });
      if (!mandiRate) {
        return res.status(404).json({ error: "Mandi Rate not found or not authorized" });
      }

      const rate = mandiRate.rates.find(r => String(r.commodity) === String(commodityId));
      if (!rate) {
        return res.status(404).json({ error: "Commodity not found in Mandi Rate" });
      }

      rate.minimum = minPrice;
      rate.maximum = maxPrice;
      rate.estimatedArrival = estArrival;
      rate.updatedAt = new Date();

      await mandiRate.save();
      return res.status(200).json({ message: "Commodity rate updated successfully" });
    } catch (err) {
      console.error("Error in editCommodity:", err);
      return res.status(500).json({ error: "Error updating commodity rate" });
    }
  };

  /**
   * Delete a commodity rate for a mandi
   */
  deleteCommodity = async (req, res) => {
    const { mandiRateId, commodityId } = req.params;

    try {
      const user = req.user;
      if (!user || !mongoose.isValidObjectId(user.id)) {
        req.flash("error_msg", "Unauthorized user");
        return res.redirect("/admin/mandirate");
      }

      if (!mongoose.isValidObjectId(mandiRateId) || !mongoose.isValidObjectId(commodityId)) {
        req.flash("error_msg", "Invalid Mandi Rate ID or Commodity ID");
        return res.redirect("/admin/mandirate");
      }

      const mandiRate = await MandiRate.findOne({ _id: mandiRateId, user_id: user.id });
      if (!mandiRate) {
        req.flash("error_msg", "Mandi Rate not found or not authorized");
        return res.redirect("/admin/mandirate");
      }

      const initialLength = mandiRate.rates.length;
      mandiRate.rates = mandiRate.rates.filter(r => String(r.commodity) !== String(commodityId));

      if (mandiRate.rates.length === initialLength) {
        req.flash("error_msg", "Commodity not found in Mandi Rate");
        return res.redirect("/admin/mandirate");
      }

      if (mandiRate.rates.length === 0) {
        await MandiRate.deleteOne({ _id: mandiRateId });
        req.flash("success_msg", "Mandi rate deleted as no commodities remain");
        return res.redirect("/admin/mandirate");
      }

      await mandiRate.save();
      req.flash("success_msg", "Commodity rate deleted successfully");
      return res.redirect("/admin/mandirate");
    } catch (err) {
      console.error("Error in deleteCommodity:", err);
      req.flash("error_msg", "Error deleting commodity rate");
      res.redirect("/admin/mandirate");
    }
  };

  /**
   * Delete an entire mandi rate
   */
  deleteMandiRate = async (req, res) => {
    const { mandiRateId } = req.params;

    try {
      const user = req.user;
      if (!user || !mongoose.isValidObjectId(user.id)) {
        req.flash("error_msg", "Unauthorized user");
        return res.redirect("/admin/mandirate");
      }

      if (!mongoose.isValidObjectId(mandiRateId)) {
        req.flash("error_msg", "Invalid Mandi Rate ID");
        return res.redirect("/admin/mandirate");
      }

      const mandiRate = await MandiRate.findOneAndDelete({ _id: mandiRateId, user_id: user.id });
      if (!mandiRate) {
        req.flash("error_msg", "Mandi Rate not found or not authorized");
        return res.redirect("/admin/mandirate");
      }

      req.flash("success_msg", "Mandi Rate deleted successfully");
      res.redirect("/admin/mandirate");
    } catch (err) {
      console.error("Error in deleteMandiRate:", err);
      req.flash("error_msg", "Error deleting Mandi Rate");
      res.redirect("/admin/mandirate");
    }
  };

  /**
   * Get districts for a given state (AJAX)
   */
  getDistricts = async (req, res) => {
    try {
      const { stateId } = req.params;
      if (!mongoose.isValidObjectId(stateId)) {
        return res.status(400).json({ error: "Invalid State ID" });
      }

      const state = await State.findById(stateId).lean();
      if (!state) {
        return res.status(404).json({ error: "State not found" });
      }

      res.json(state.districts || []);
    } catch (err) {
      console.error("Error in getDistricts:", err);
      res.status(500).json({ error: "Error fetching districts" });
    }
  };

  /**
   * Get mandis for a given district (AJAX)
   */
  getMandis = async (req, res) => {
    try {
      const { district } = req.params;
      const userId = req.user?.id;

      if (!district || !userId || !mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ error: "District and valid user ID are required" });
      }

      const mandis = await Mandi.find({ district: district.trim(), user_id: userId })
        .select("_id name state")
        .lean();
      res.json(mandis.map(m => ({ id: m._id, name: m.name, state: m.state })));
    } catch (err) {
      console.error("Error in getMandis:", err);
      res.status(500).json({ error: "Error fetching mandis" });
    }
  };

  /**
   * Get report data for modal (AJAX)
   */
  getReportData = async (req, res) => {
    try {
      const user = req.user;
      if (!user || !mongoose.isValidObjectId(user.id)) {
        return res.status(401).json({ error: "Unauthorized user" });
      }

      const { days, state, district, mandi } = req.query || {};
      let query = { user_id: user.id };
      if (state && mongoose.isValidObjectId(state)) query.state = state;
      if (district) query.district = district.trim();
      if (mandi && mongoose.isValidObjectId(mandi)) query.mandi = mandi;
      const daysNum = parseInt(days) || null;
      if (daysNum) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - daysNum);
        query.updatedAt = { $gte: threshold };
      }

      const rates = await MandiRate.find(query)
        .populate("state", "name")
        .populate("mandi", "name")
        .populate("rates.commodity", "name")
        .sort({ "mandi.name": 1 })
        .lean();

      const data = rates.flatMap((rate, index) =>
        rate.rates.map(item => ({
          sno: index + 1,
          mandiName: rate.mandi?.name || "",
          address: `${rate.state?.name || ""}/${rate.district || ""}/${rate.mandi?.name || ""}`,
          commodity: item.commodity?.name || "",
          minimum: item.minimum || 0,
          maximum: item.maximum || 0,
          estimatedArrival: item.estimatedArrival ?? "",
          lastUpdated: item.updatedAt
            ? new Date(item.updatedAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
        }))
      );

      res.json(data);
    } catch (err) {
      console.error("Error in getReportData:", err);
      res.status(500).json({ error: "Error fetching report data" });
    }
  };

  /**
   * Export mandi rates as CSV
   */
  exportCSV = async (req, res) => {
    try {
      const user = req.user;
      if (!user || !mongoose.isValidObjectId(user.id)) {
        return res.status(401).json({ error: "Unauthorized user" });
      }

      const { state, district, mandi, days } = req.query || {};
      let query = { user_id: user.id };
      if (state && mongoose.isValidObjectId(state)) query.state = state;
      if (district) query.district = district.trim();
      if (mandi && mongoose.isValidObjectId(mandi)) query.mandi = mandi;
      const daysNum = parseInt(days) || null;
      if (daysNum) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - daysNum);
        query.updatedAt = { $gte: threshold };
      }

      const rates = await MandiRate.find(query)
        .populate("state", "name")
        .populate("mandi", "name")
        .populate("rates.commodity", "name")
        .lean();

      const fields = [
        { label: "Sl No", value: (row, field, index) => index + 1 },
        { label: "Mandi Name", value: row => row.mandi?.name || "" },
        {
          label: "Address (State/District/Mandi)",
          value: row => `${row.state?.name || ""}/${row.district || ""}/${row.mandi?.name || ""}`,
        },
        { label: "Commodity", value: row => row.commodity?.name || "" },
        { label: "Min Price", value: row => row.minimum || 0 },
        { label: "Max Price", value: row => row.maximum || 0 },
        { label: "Est. Qty", value: row => row.estimatedArrival ?? "" },
        {
          label: "Last Updated",
          value: row =>
            row.updatedAt
              ? new Date(row.updatedAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
        },
      ];

      const data = rates.flatMap((rate, index) =>
        rate.rates.map(item => ({
          ...item,
          state: rate.state,
          district: rate.district,
          mandi: rate.mandi,
          updatedAt: item.updatedAt || rate.updatedAt,
        }))
      );

      const json2csv = new Parser({ fields });
      const csv = json2csv.parse(data);

      res.header("Content-Type", "text/csv");
      res.attachment("mandi_rates.csv");
      res.send(csv);
    } catch (err) {
      console.error("Error in exportCSV:", err);
      res.status(500).json({ error: "Error exporting CSV" });
    }
  };

  /**
   * Export mandi rates as Excel
   */
  exportExcel = async (req, res) => {
    try {
      const user = req.user;
      if (!user || !mongoose.isValidObjectId(user.id)) {
        return res.status(401).json({ error: "Unauthorized user" });
      }

      const { state, district, mandi, days } = req.query || {};
      let query = { user_id: user.id };
      if (state && mongoose.isValidObjectId(state)) query.state = state;
      if (district) query.district = district.trim();
      if (mandi && mongoose.isValidObjectId(mandi)) query.mandi = mandi;
      const daysNum = parseInt(days) || null;
      if (daysNum) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - daysNum);
        query.updatedAt = { $gte: threshold };
      }

      const rates = await MandiRate.find(query)
        .populate("state", "name")
        .populate("mandi", "name")
        .populate("rates.commodity", "name")
        .lean();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Mandi Rates");

      worksheet.columns = [
        { header: "Sl No", key: "sno", width: 10 },
        { header: "Mandi Name", key: "mandiName", width: 20 },
        { header: "Address (State/District/Mandi)", key: "address", width: 30 },
        { header: "Commodity", key: "commodity", width: 20 },
        { header: "Min Price", key: "minimum", width: 15 },
        { header: "Max Price", key: "maximum", width: 15 },
        { header: "Est. Qty", key: "estimatedArrival", width: 15 },
        { header: "Last Updated", key: "lastUpdated", width: 20 },
      ];

      rates.forEach((rate, index) =>
        rate.rates.forEach(item => {
          worksheet.addRow({
            sno: index + 1,
            mandiName: rate.mandi?.name || "",
            address: `${rate.state?.name || ""}/${rate.district || ""}/${rate.mandi?.name || ""}`,
            commodity: item.commodity?.name || "",
            minimum: item.minimum || 0,
            maximum: item.maximum || 0,
            estimatedArrival: item.estimatedArrival ?? "",
            lastUpdated: item.updatedAt
              ? new Date(item.updatedAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
          });
        })
      );

      res.header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.attachment("mandi_rates.xlsx");
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("Error in exportExcel:", err);
      res.status(500).json({ error: "Error exporting Excel" });
    }
  };

  /**
   * Export mandi rates as PDF
   */
  exportPDF = async (req, res) => {
    try {
      const user = req.user;
      if (!user || !mongoose.isValidObjectId(user.id)) {
        return res.status(401).json({ error: "Unauthorized user" });
      }

      const { state, district, mandi, days } = req.query || {};
      let query = { user_id: user.id };
      if (state && mongoose.isValidObjectId(state)) query.state = state;
      if (district) query.district = district.trim();
      if (mandi && mongoose.isValidObjectId(mandi)) query.mandi = mandi;
      const daysNum = parseInt(days) || null;
      if (daysNum) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - daysNum);
        query.updatedAt = { $gte: threshold };
      }

      const rates = await MandiRate.find(query)
        .populate("state", "name")
        .populate("mandi", "name")
        .populate("rates.commodity", "name")
        .lean();

      const doc = new PDFDocument({ size: "A4", margin: 20 });
      res.header("Content-Type", "application/pdf");
      res.attachment(`mandi_rates_${days || 'all'}_days.pdf`);
      doc.pipe(res);

      doc.fontSize(16).text(`Mandi Rates Report (${days || 'All'} Days)`, { align: "center" });
      doc.moveDown();

      const table = {
        headers: [
          "Sl No",
          "Mandi Name",
          "Address (State/District/Mandi)",
          "Commodity",
          "Min Price",
          "Max Price",
          "Est. Qty",
          "Last Updated",
        ],
        rows: rates.flatMap((rate, index) =>
          rate.rates.map(item => [
            index + 1,
            rate.mandi?.name || "",
            `${rate.state?.name || ""}/${rate.district || ""}/${rate.mandi?.name || ""}`,
            item.commodity?.name || "",
            item.minimum || 0,
            item.maximum || 0,
            item.estimatedArrival ?? "",
            item.updatedAt
              ? new Date(item.updatedAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
          ])
        ),
      };

      await doc.table(table, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
        prepareRow: () => doc.font("Helvetica").fontSize(8),
        padding: 2,
        columnWidths: [30, 80, 120, 80, 50, 50, 50, 80],
      });

      doc.end();
    } catch (err) {
      console.error("Error in exportPDF:", err);
      res.status(500).json({ error: "Error exporting PDF" });
    }
  };
}

module.exports = new MandiRateController();
