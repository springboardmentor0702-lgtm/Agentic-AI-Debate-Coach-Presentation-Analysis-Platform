const mongoose = require("mongoose");
const auditLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  adminName: String,
  action: { type: String, required: true },
  details: { type: String, default: "" }
}, { timestamps: true });
module.exports = mongoose.model("AuditLog", auditLogSchema);
