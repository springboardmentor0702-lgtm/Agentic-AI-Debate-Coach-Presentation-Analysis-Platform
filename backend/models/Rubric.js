const mongoose = require("mongoose");
const rubricSchema = new mongoose.Schema({
  educatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  criteria: [{ name: String, maxScore: { type: Number, default: 100 } }]
}, { timestamps: true });
module.exports = mongoose.model("Rubric", rubricSchema);
