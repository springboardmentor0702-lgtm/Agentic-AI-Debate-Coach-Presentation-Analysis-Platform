const mongoose = require("mongoose");

const presentationSchema = new mongoose.Schema(
  {
    legacyId: { type: Number },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    legacyUserId: { type: Number, index: true },
    userEmail: { type: String, index: true },
    userName: String,
    title: { type: String, required: true },
    transcript: { type: String, default: "" },
    duration: String,
    durationSeconds: Number,
    wpm: Number,
    fillerWords: Number,
    fillerBreakdown: String,
    confidence: Number,
    clarity: Number,
    engagement: Number,
    paceStatus: String,
    feedback: mongoose.Schema.Types.Mixed,
    source: { type: String, default: "presentation-analysis" },
    recordedAt: { type: Date, default: Date.now }
  },
  { timestamps: true, strict: false }
);

presentationSchema.index({ legacyId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Presentation", presentationSchema);