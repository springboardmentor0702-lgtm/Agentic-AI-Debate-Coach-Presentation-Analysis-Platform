const mongoose = require("mongoose");
const assignmentSchema = new mongoose.Schema({
  educatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  dueDate: { type: Date, required: true },
  submissions: [{
    learnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: String,
    submittedAt: Date,
    grade: { type: Number, default: null },
    feedback: { type: String, default: "" }
  }]
}, { timestamps: true });
module.exports = mongoose.model("Assignment", assignmentSchema);
