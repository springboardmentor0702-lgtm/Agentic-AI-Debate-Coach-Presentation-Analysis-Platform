const mongoose = require("mongoose");
const supportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["Open", "Resolved"], default: "Open" }
}, { timestamps: true });
module.exports = mongoose.model("SupportTicket", supportTicketSchema);
