const mongoose = require("mongoose");
const toolUsageLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tool: {
    type: String,
    enum: ["ArgumentAnalyzer", "FallacyDetector", "CounterargumentGenerator"],
    required: true
  }
}, { timestamps: true });
module.exports = mongoose.model("ToolUsageLog", toolUsageLogSchema);
