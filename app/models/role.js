const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserRoleSchema = new Schema({
  role: { type: String, enum: ["user"], default: "user" }, // always user
  subroles: [
    {
      name: { type: String, required: true }, // e.g. vendor, broker
      categories: [{ type: String, required: true }] // e.g. ["daal", "rice"]
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("UserRole", UserRoleSchema);
