const mongoose = require("mongoose");

const presentationSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true },
    slideCount: { type: Number, default: 0 },
    transcript: { type: String, default: "" },

    presentationMetrics: {
      wordsPerMinute: { type: Number, default: null },
      paceStatus: { type: String, default: null },
      fillerWordCount: { type: Number, default: null }
    },

    deliveryMetrics: {
      confidenceScore: { type: Number, default: 0 },
      clarityScore: { type: Number, default: 0 },
      engagementScore: { type: Number, default: 0 },
      overallFeedback: { type: String, default: "" },
      grammarIssues: {
        type: [{ originalText: String, correctedText: String, explanation: String }],
        default: []
      }
    },

    contentReview: {
      structureScore: { type: Number, default: 0 },
      clarityScore: { type: Number, default: 0 },
      claimSupportScore: { type: Number, default: 0 },
      flowScore: { type: Number, default: 0 },
      slideFeedback: {
        type: [{ slideNumber: Number, feedback: String }],
        default: []
      },
      overallContentFeedback: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PresentationSession", presentationSessionSchema);
