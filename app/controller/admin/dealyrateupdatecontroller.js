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

 /**
 * Helper to fetch and prepare grouped mandi rates data
 */
// Fetch grouped mandi rates (NOT user-specific)
const getGroupedMandiRates = async (queryParams = {}) => {
  const { state, district, mandi, days } = queryParams;
  let query = {};
  if (state && mongoose.isValidObjectId(state)) query.state = state;
  if (district) query.district = district.trim();
  if (mandi && mongoose.isValidObjectId(mandi)) query.mandi = mandi;

  const daysNum = parseInt(days) || null;
  const threshold = daysNum ? new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000) : null;

  const rates = await MandiRate.find(query)
    .populate({ path: "state", select: "name" })
    .populate({ path: "mandi", select: "name" })
    .populate({ path: "rates.commodity", select: "name" })
    .lean();

  if (!rates || rates.length === 0) return { groups: {}, days: days || "All" };

  let filteredRates = rates.flatMap(rate => {
    if (!rate.rates || rate.rates.length === 0) return [];

    return rate.rates
      .filter(item => {
        const isValidDate = !threshold || (item.updatedAt && new Date(item.updatedAt) >= threshold);
        const hasCommodity = item.commodity && item.commodity.name;
        const validPrices =
          item.minimum != null && !isNaN(item.minimum) && item.minimum >= 0 &&
          item.maximum != null && !isNaN(item.maximum) && item.maximum >= 0 &&
          item.minimum <= item.maximum;

        return isValidDate && hasCommodity && validPrices;
      })
      .map(item => {
        const minPrice = Number(item.minimum) || 0;
        const maxPrice = Number(item.maximum) || 0;

        return {
          mandi: rate.mandi || { name: "Unknown" },
          state: rate.state || { name: "Unknown" },
          district: rate.district || "Unknown",
          commodity: item.commodity || { name: "Unknown" },
          minimum: minPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          maximum: maxPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          estimatedArrival: item.estimatedArrival ?? "N/A",
          updatedAt: item.updatedAt || rate.updatedAt,
        };
      });
  });

  // Sort
  filteredRates.sort((a, b) => {
    const stateA = a.state?.name || "";
    const stateB = b.state?.name || "";
    const distA = a.district || "";
    const distB = b.district || "";
    const mandiA = a.mandi?.name || "";
    const mandiB = b.mandi?.name || "";
    const commA = a.commodity?.name || "";
    const commB = b.commodity?.name || "";
    return stateA.localeCompare(stateB) || distA.localeCompare(distB) ||
           mandiA.localeCompare(mandiB) || commA.localeCompare(commB);
  });

  const groups = {};
  let globalIndex = 1;

  filteredRates.forEach(item => {
    const stateName = item.state?.name || "Unknown";
    const distName = item.district || "Unknown";
    const mandiName = item.mandi?.name || "Unknown";

    if (!groups[stateName]) groups[stateName] = {};
    if (!groups[stateName][distName]) groups[stateName][distName] = {};
    if (!groups[stateName][distName][mandiName]) groups[stateName][distName][mandiName] = [];

    groups[stateName][distName][mandiName].push({
      ...item,
      sno: globalIndex++,
      address: `${stateName}/${distName}/${mandiName}`,
      commodityName: item.commodity?.name || "Unknown",
      lastUpdated: item.updatedAt
        ? new Date(item.updatedAt).toLocaleString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }).replace(",", "")
        : "N/A",
    });
  });

  return { groups, days: days || "All" };
};

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
        await MandiRate.updateMany({}, {
          $pull: { rates: { updatedAt: { $lt: thirtyDaysAgo } } }
        });
        await MandiRate.deleteMany({ "rates.0": { $exists: false } });
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
    const minPrice = Number(min || 0);
    const maxPrice = Number(max || 0);
    const estArrival = Number(arrival || 0);

    if (isNaN(minPrice) || isNaN(maxPrice) || minPrice < 0 || maxPrice < 0) {
      throw new Error(`Invalid price values for commodity at index ${index}`);
    }
    if (minPrice > maxPrice) {
      throw new Error(`Minimum price cannot be greater than maximum price at index ${index}`);
    }
    if (isNaN(estArrival) || estArrival < 0) {
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
      let query = {}; // ✅ removed user_id filter

      if (state && mongoose.isValidObjectId(state)) query.state = state;
      if (district) query.district = district.trim();
      if (mandi && mongoose.isValidObjectId(mandi)) query.mandi = mandi;

      let rates = await MandiRate.find(query)
        .populate("state", "name")
        .populate("mandi", "name state")
        .populate("rates.commodity", "name")
        .lean();

      // ✅ Sort by mandi name after populate
      rates.sort((a, b) => {
        const nameA = a.mandi?.name?.toLowerCase() || "";
        const nameB = b.mandi?.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
      });

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

      mandiRate.updatedAt = new Date();
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
      return res.status(400).json({ error: "Invalid IDs" });
    }

    const minPrice = Number(minimum || 0);
    const maxPrice = Number(maximum || 0);
    const estArrival = Number(estimatedArrival || 0);

    if (isNaN(minPrice) || isNaN(maxPrice) || minPrice < 0 || maxPrice < 0) {
      return res.status(400).json({ error: "Minimum and Maximum must be non-negative numbers" });
    }
    if (minPrice > maxPrice) {
      return res.status(400).json({ error: "Minimum cannot be greater than Maximum" });
    }
    if (isNaN(estArrival) || estArrival < 0) {
      return res.status(400).json({ error: "Estimated arrival must be non-negative" });
    }

    const mandiRate = await MandiRate.findById(mandiRateId);
    if (!mandiRate) return res.status(404).json({ error: "Mandi Rate not found" });

    // Filter entries for this commodity and sort by updatedAt descending
    const commodityRates = mandiRate.rates
      .filter(r => String(r.commodity) === commodityId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (commodityRates.length === 0) {
      return res.status(404).json({ error: "Commodity not found" });
    }

    // Update the most recent one
    const rate = commodityRates[0];
    rate.minimum = minPrice;
    rate.maximum = maxPrice;
    rate.estimatedArrival = estArrival;
    rate.updatedAt = new Date();

    mandiRate.updatedAt = new Date();

    // Remove entries older than 30 days
    const now = new Date();
    mandiRate.rates = mandiRate.rates.filter(r => (now - new Date(r.updatedAt)) / (1000 * 60 * 60 * 24) <= 30);

    await mandiRate.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, message: "Commodity rate updated successfully", data: rate });
  } catch (err) {
    console.error("Error in editCommodity:", err);
    return res.status(500).json({ error: err.message || "Error updating commodity rate" });
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

      mandiRate.updatedAt = new Date();
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


/**
 * Get mandi rates data
 */ 
 getReportData = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !mongoose.isValidObjectId(user.id)) {
      return res.status(401).json({ error: "Unauthorized user" });
    }

    const { groups, days } = await getGroupedMandiRates(user, req.query);

    const groupedData = [];
    for (const stateName in groups) {
      const stateGroup = { state: stateName, stateId: null, districts: [] };
      for (const distName in groups[stateName]) {
        const districtGroup = { district: distName, mandis: [] };
        for (const mandiName in groups[stateName][distName]) {
          const mandiGroup = {
            mandi: mandiName,
            mandiId: groups[stateName][distName][mandiName][0].mandi?._id || "",
            commodities: groups[stateName][distName][mandiName].map(item => ({
              sno: item.sno,
              mandiName: item.mandi?.name || "",
              address: item.address,
              commodity: item.commodityName,
              minimum: item.minimum || 0,
              maximum: item.maximum || 0,
              estimatedArrival: item.estimatedArrival ?? "",
              lastUpdated: item.lastUpdated
            }))
          };
          districtGroup.mandis.push(mandiGroup);
        }
        stateGroup.districts.push(districtGroup);
      }
      groupedData.push(stateGroup);
    }

    return res.json({ days, data: groupedData });
  } catch (err) {
    console.error("Error in getReportData:", err);
    return res.status(500).json({ error: "Error fetching report data" });
  }
};

/**
 * Export mandi rates as CSV (grouped by state, district, and mandi)
 */
 exportCSV = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !mongoose.isValidObjectId(user.id)) {
      return res.status(401).json({ error: "Unauthorized user" });
    }

    const { groups, days } = await getGroupedMandiRates(user, req.query);

    const fields = [
      { label: "Sl No", value: "sno" },
      { label: "Mandi Name", value: "mandiName" },
      { label: "Address (State/District/Mandi)", value: "address" },
      { label: "Commodity", value: "commodity" },
      { label: "Min Price", value: "minimum" },
      { label: "Max Price", value: "maximum" },
      { label: "Est. Qty", value: "estimatedArrival" },
      { label: "Last Updated", value: "lastUpdated" }
    ];

    const json2csv = new Parser({ fields });
    let csvData = [`Grouped Mandi Rates Report (${days} Days)`];
    csvData.push(""); // Spacer

    for (const stateName in groups) {
      csvData.push(`*** State: ${stateName} ***,,,,,,,`);
      for (const distName in groups[stateName]) {
        csvData.push(`--- District: ${distName} ---,,,,,,,`);
        for (const mandiName in groups[stateName][distName]) {
          csvData.push(`Mandi: ${mandiName},,,,,,,`);
          const mandiRows = groups[stateName][distName][mandiName].map(item => ({
            sno: item.sno,
            mandiName: item.mandi?.name || "",
            address: item.address,
            commodity: item.commodityName,
            minimum: item.minimum || 0,
            maximum: item.maximum || 0,
            estimatedArrival: item.estimatedArrival ?? "",
            lastUpdated: item.lastUpdated
          }));
          csvData.push(...json2csv.parse(mandiRows));
          csvData.push(""); // Spacer
        }
      }
    }

    const csv = csvData.join("\n");

    res.header("Content-Type", "text/csv");
    res.attachment(`grouped_mandi_rates_${days}_days.csv`);
    res.send(csv);
  } catch (err) {
    console.error("Error in exportCSV:", err);
    res.status(500).json({ error: "Error exporting CSV" });
  }
};

/**
 * Export mandi rates as Excel (grouped by state, district, and mandi)
 */
 exportExcel = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !mongoose.isValidObjectId(user.id)) {
      return res.status(401).json({ error: "Unauthorized user" });
    }

    const { groups, days } = await getGroupedMandiRates(user, req.query);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mandi Rates");

    const columns = [
      { header: "Sl No", key: "sno", width: 10 },
      { header: "Mandi Name", key: "mandiName", width: 20 },
      { header: "Address (State/District/Mandi)", key: "address", width: 30 },
      { header: "Commodity", key: "commodity", width: 20 },
      { header: "Min Price", key: "minimum", width: 15 },
      { header: "Max Price", key: "maximum", width: 15 },
      { header: "Est. Qty", key: "estimatedArrival", width: 15 },
      { header: "Last Updated", key: "lastUpdated", width: 20 }
    ];
    worksheet.columns = columns;

    worksheet.addRow([]);
    const titleRow = worksheet.addRow([`Grouped Mandi Rates Report (${days} Days)`]);
    titleRow.font = { size: 16, bold: true };
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, 8);
    worksheet.addRow([]);

    for (const stateName in groups) {
      const stateRow = worksheet.addRow([`*** State: ${stateName} ***`]);
      stateRow.font = { size: 14, bold: true, color: { argb: "FF0000" } };
      worksheet.mergeCells(stateRow.number, 1, stateRow.number, 8);

      for (const distName in groups[stateName]) {
        const distRow = worksheet.addRow([`--- District: ${distName} ---`]);
        distRow.font = { size: 12, italic: true, color: { argb: "FF0000FF" } };
        worksheet.mergeCells(distRow.number, 1, distRow.number, 8);

        for (const mandiName in groups[stateName][distName]) {
          const mandiRow = worksheet.addRow([`Mandi: ${mandiName}`]);
          mandiRow.font = { size: 10, bold: true };
          worksheet.mergeCells(mandiRow.number, 1, mandiRow.number, 8);

          groups[stateName][distName][mandiName].forEach(item => {
            worksheet.addRow({
              sno: item.sno,
              mandiName: item.mandi?.name || "",
              address: item.address,
              commodity: item.commodityName,
              minimum: item.minimum || 0,
              maximum: item.maximum || 0,
              estimatedArrival: item.estimatedArrival ?? "",
              lastUpdated: item.lastUpdated
            });
          });
          worksheet.addRow([]);
        }
      }
    }

    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.attachment(`grouped_mandi_rates_${days}_days.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error in exportExcel:", err);
    res.status(500).json({ error: "Error exporting Excel" });
  }
};

/**
 * Export mandi rates as PDF (grouped by state, district, and mandi)
 */
 exportPDF = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !mongoose.isValidObjectId(user.id)) {
      return res.status(401).json({ error: "Unauthorized user" });
    }

    const { groups, days } = await getGroupedMandiRates(user, req.query);

    const doc = new PDFDocument({ size: "A4", margin: 20 });
    res.header("Content-Type", "application/pdf");
    res.attachment(`grouped_mandi_rates_${days}_days.pdf`);
    doc.pipe(res);

    doc.font("Helvetica-Bold").fontSize(16).text(`Grouped Mandi Rates Report (${days} Days)`, { align: "center" });
    doc.moveDown(1);

    const headers = [
      "Sl No",
      "Mandi Name",
      "Address (State/District/Mandi)",
      "Commodity",
      "Min Price",
      "Max Price",
      "Est. Qty",
      "Last Updated"
    ];

    for (const stateName in groups) {
      doc.font("Helvetica-Bold").fontSize(14).text(`State: ${stateName}`, { underline: true });
      doc.moveDown(0.5);

      for (const distName in groups[stateName]) {
        doc.font("Helvetica").fontSize(12).text(`District: ${distName}`);
        doc.moveDown(0.5);

        for (const mandiName in groups[stateName][distName]) {
          doc.font("Helvetica").fontSize(10).text(`Mandi: ${mandiName}`);
          doc.moveDown(0.5);

          const rows = groups[stateName][distName][mandiName].map(item => [
            item.sno,
            item.mandi?.name || "",
            item.address,
            item.commodityName,
            item.minimum || 0,
            item.maximum || 0,
            item.estimatedArrival ?? "",
            item.lastUpdated
          ]);

          const table = { headers, rows };
          await doc.table(table, {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
            prepareRow: () => doc.font("Helvetica").fontSize(8),
            padding: 2,
            columnsSize: [30, 80, 120, 80, 50, 50, 50, 80]
          });

          doc.moveDown(1);
        }
      }
    }

    doc.end();
  } catch (err) {
    console.error("Error in exportPDF:", err);
    res.status(500).json({ error: "Error exporting PDF" });
  }
};


/**
 * Export mandi rates as Grouped PDF (same as exportPDF for consistency)
 */

/**
 * Export mandi rates as Grouped PDF (similar to exportPDF but clearly grouped)
 */
exportGroupedPDF = async (req, res) => {
  try {
    const { groups, days } = await getGroupedMandiRates(req.query);

    const doc = new PDFDocument({ size: "A4", margin: 20, bufferPages: true });
    res.header("Content-Type", "application/pdf");
    res.attachment(`grouped_mandi_rates_${days}_days.pdf`);
    doc.pipe(res);

    // PDF Title
    doc.font("Helvetica-Bold")
      .fontSize(16)
      .text(`Grouped Mandi Rates Report (${days} Days)`, { align: "center" });
    doc.moveDown(1);

    const headers = ["Sl No", "Mandi Name", "Address (State/District/Mandi)", "Commodity", "Min Price", "Max Price", "Est. Qty", "Last Updated"];

    for (const stateName in groups) {
      doc.font("Helvetica-Bold").fontSize(14).text(`State: ${stateName}`, { underline: true });
      doc.moveDown(0.5);

      for (const distName in groups[stateName]) {
        doc.font("Helvetica-Oblique").fontSize(12).text(`District: ${distName}`);
        doc.moveDown(0.5);

        for (const mandiName in groups[stateName][distName]) {
          doc.font("Helvetica").fontSize(11).text(`Mandi: ${mandiName}`);
          doc.moveDown(0.3);

          const rows = groups[stateName][distName][mandiName].map(item => [
            item.sno,
            item.mandi?.name || "",
            item.address,
            item.commodityName,
            item.minimum || 0,
            item.maximum || 0,
            item.estimatedArrival ?? "",
            item.lastUpdated
          ]);

          const table = { headers, rows };

          // This ensures the table splits across multiple pages
          await doc.table(table, {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8),
            prepareRow: (row, i) => doc.font("Helvetica").fontSize(8),
            padding: 2,
            columnsSize: [30, 80, 120, 80, 50, 50, 50, 80],
            // enable breaking across pages
            columnSpacing: 5,
            width: 500,
            x: doc.page.margins.left,
            y: doc.y
          });

          doc.moveDown(1);
        }
      }
    }

    doc.end();
  } catch (err) {
    console.error("Error in exportGroupedPDF:", err);
    res.status(500).json({ error: "Error exporting grouped PDF" });
  }
};
}

module.exports = new MandiRateController();

