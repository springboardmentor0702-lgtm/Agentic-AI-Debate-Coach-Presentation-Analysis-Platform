const mongoose = require("mongoose");

const debateHistorySchema = new mongoose.Schema(
  {
    legacyId: { type: Number },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    legacyUserId: { type: Number, index: true },
    userEmail: { type: String, index: true },
    userName: String,
    topic: String,
    format: String,
    position: String,
    opponentPersona: String,
    score: Number,
    status: String,
    date: String,
    completedAt: Date,
    fallacies: mongoose.Schema.Types.Mixed,
    transcript: mongoose.Schema.Types.Mixed,
    scores: mongoose.Schema.Types.Mixed,
    executiveSummary: String,
    verdict: String,
    strengths: mongoose.Schema.Types.Mixed,
    areasForImprovement: mongoose.Schema.Types.Mixed,
    coachingReview: String,
    reviewedByCoach: { type: Boolean, default: false },
    coachFeedback: { type: String, default: "" },
    coachFeedbackBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    coachFeedbackByName: { type: String, default: "" },
    coachGrade: { type: String, default: "" },
    coachLogicGap: { type: String, default: "" },
    reviewedByEducator: { type: Boolean, default: false },
    educatorFeedback: { type: String, default: "" },
    educatorFeedbackBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    educatorFeedbackByName: { type: String, default: "" },
    source: { type: String, default: "debate" }
  },
  { timestamps: true, strict: false }
);

debateHistorySchema.index({ legacyId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("DebateHistory", debateHistorySchema);