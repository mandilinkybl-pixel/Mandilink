const Mandi = require("../../models/mandirates");
const Commodity = require("../../models/commodityname");
const ScheduleEmployeeSchema = require("../../models/adminEmployee");

// Utility to ensure value is a number or null
function toNum(val) {
  if (val === undefined || val === null || val === "") return null;
  if (Array.isArray(val)) return val.map(toNum);
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// Utility to ensure value is a string or null
function toStr(val) {
  if (val === undefined || val === null) return null;
  if (Array.isArray(val)) return val.map(toStr);
  return String(val);
}

// Get all Mandis (for list/table)
exports.getMandis = async (req, res) => {
  const user = req.user;
  const userdetails = await ScheduleEmployeeSchema.findById(user.id);
   const employee = await ScheduleEmployeeSchema.findById(user.id);
  const mandis = await Mandi.find().populate("commodityPrices.commodity");
  const allCommodities = await Commodity.find({ status: "active" }).lean();
  res.render("employees/mandiprice", { user, userdetails, mandis, commodities: allCommodities, employee });
};

// Render Create Mandi Page/Modal
exports.renderCreateMandi = async (req, res) => {
  const commodities = await Commodity.find({ status: "active" });
  res.render("mandi-create", { commodities });
};

// Create Mandi
exports.createMandi = async (req, res) => {
  // Commodity selection
  let commodityPrices = [];
  // Support single and multiple commodity selection
  const commoditiesArr = Array.isArray(req.body.commodity) ? req.body.commodity : [req.body.commodity];
  const priceArr = Array.isArray(req.body.price) ? req.body.price : [req.body.price];
  const unitArr = Array.isArray(req.body.unit) ? req.body.unit : [req.body.unit];
  const weightArr = Array.isArray(req.body.weight) ? req.body.weight : [req.body.weight];

  for (let i = 0; i < commoditiesArr.length; i++) {
    if (commoditiesArr[i]) {
      commodityPrices.push({
        commodity: commoditiesArr[i],
        price: toNum(priceArr[i]) || 0,
        unit: toStr(unitArr[i]) || "₹/quintal",
        weight: toNum(weightArr[i])
      });
    }
  }

  const mandi = new Mandi({
    mandiName: req.body.mandiName,
    phone: req.body.phone,
    state: req.body.state,
    district: req.body.district,
    pincode: req.body.pincode,
    address: req.body.address,
    location: {
      lat: toNum(req.body.lat),
      lng: toNum(req.body.lng),
    },
    contactPerson: req.body.contactPerson,
    contactNumber: req.body.contactNumber,
    email: req.body.email,
    type: req.body.type,
    connectedWithENAM: req.body.connectedWithENAM === "on",
    status: req.body.status,
    commodityPrices,
  });
  await mandi.save();
  res.redirect("/employees/mandis");
};

// Render Update Mandi Page/Modal
exports.renderUpdateMandi = async (req, res) => {
  const mandi = await Mandi.findById(req.params.id).populate("commodityPrices.commodity");
  res.render("mandi-update", { mandi });
};

// Update Mandi (details except prices)
exports.updateMandi = async (req, res) => {
  const updateFields = {
    mandiName: req.body.mandiName,
    phone: req.body.phone,
    state: req.body.state,
    district: req.body.district,
    pincode: req.body.pincode,
    address: req.body.address,
    location: {
      lat: toNum(req.body.lat),
      lng: toNum(req.body.lng),
    },
    contactPerson: req.body.contactPerson,
    contactNumber: req.body.contactNumber,
    email: req.body.email,
    type: req.body.type,
    connectedWithENAM: req.body.connectedWithENAM === "on",
    status: req.body.status,
  };
  await Mandi.findByIdAndUpdate(req.params.id, updateFields);
  res.redirect("/employees/mandis");
};

// Delete Mandi
exports.deleteMandi = async (req, res) => {
  await Mandi.findByIdAndDelete(req.params.id);
  res.redirect("/employees/mandis");
};

// Render Update Price Modal/Page
exports.renderUpdatePrices = async (req, res) => {
  const mandi = await Mandi.findById(req.params.id).populate("commodityPrices.commodity");
  const commodities = await Commodity.find({ status: "active" });
  res.render("mandi-update-prices", { mandi, commodities });
};

// Update Commodity Prices for a Mandi
exports.updatePrices = async (req, res) => {
  let newPrices = [];
  const commoditiesArr = Array.isArray(req.body.commodity) ? req.body.commodity : [req.body.commodity];
  const priceArr = Array.isArray(req.body.price) ? req.body.price : [req.body.price];
  const unitArr = Array.isArray(req.body.unit) ? req.body.unit : [req.body.unit];
  const weightArr = Array.isArray(req.body.weight) ? req.body.weight : [req.body.weight];

  for (let i = 0; i < commoditiesArr.length; i++) {
    if (commoditiesArr[i]) {
      newPrices.push({
        commodity: commoditiesArr[i],
        price: toNum(priceArr[i]) || 0,
        unit: toStr(unitArr[i]) || "₹/quintal",
        weight: toNum(weightArr[i])
      });
    }
  }

  await Mandi.findByIdAndUpdate(req.params.id, { commodityPrices: newPrices });
  res.redirect("/employees/mandis");
};