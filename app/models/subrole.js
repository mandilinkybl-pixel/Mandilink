const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubroleSchema = new Schema({
  name: { type: String, required: true, unique: true }, // e.g. vendor, broker
  categories: [{ type: String, required: true }]        // e.g. ["daal", "rice"]
}, { timestamps: true });

module.exports = mongoose.model("Subrole", SubroleSchema);
