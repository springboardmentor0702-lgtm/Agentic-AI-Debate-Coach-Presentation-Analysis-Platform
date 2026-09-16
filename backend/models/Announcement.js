const mongoose = require("mongoose");
const announcementSchema = new mongoose.Schema({
  educatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", default: null },
  message: { type: String, required: true }
}, { timestamps: true });
module.exports = mongoose.model("Announcement", announcementSchema);
