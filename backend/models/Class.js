const mongoose = require("mongoose");
const classSchema = new mongoose.Schema({
  educatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  learnerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // ✅ Each assignment now carries a real timestamp, so "assigned 2 days
  // ago" and "recently assigned" notifications are honest, not guessed.
  assignedTopics: [{
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
    assignedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });
module.exports = mongoose.model("Class", classSchema);
