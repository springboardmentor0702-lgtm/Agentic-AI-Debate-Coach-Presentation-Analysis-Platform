require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const Presentation = require("./models/Presentation");
const DebateHistory = require("./models/DebateHistory");

const storePath = path.join(__dirname, "..", "frontend", "data", "store.json");

async function migrate() {
  const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
  await mongoose.connect(process.env.MONGO_URI);

  const userMap = new Map();
  for (const source of store.users || []) {
    const legacyId = Number(source.user_id || source.id) || undefined;
    const email = String(source.email || `migrated-${legacyId || "user"}@migrated.local`).toLowerCase();
    const existing = await User.findOne({ $or: [{ email }, ...(legacyId ? [{ legacyId }] : [])] });
    const user = existing || new User({
      email,
      password: await bcrypt.hash(`migrated-${source.id || Date.now()}`, 10)
    });
    user.legacyId = legacyId;
    user.name = source.name || email.split("@")[0];
    user.role = source.role || "Learner";
    user.experience = source.experience || "Beginner";
    await user.save();
    if (source.id != null) userMap.set(Number(source.id), user);
    if (source.user_id != null) userMap.set(Number(source.user_id), user);
  }

  for (const source of store.presentationHistory || []) {
    const user = userMap.get(Number(source.user_id));
    await Presentation.findOneAndUpdate(
      { legacyId: Number(source.id) || undefined },
      {
        legacyId: Number(source.id) || undefined,
        userId: user?._id || null,
        legacyUserId: Number(source.user_id) || undefined,
        userEmail: source.user_email || user?.email || null,
        userName: source.user_name || user?.name || "Speaker",
        title: source.title || "Speech Practice",
        transcript: source.transcript || "",
        duration: source.duration,
        durationSeconds: Number(source.duration_seconds || 30),
        wpm: Number(source.wpm || 0),
        fillerWords: Number(source.fillerWords || 0),
        fillerBreakdown: source.fillerBreakdown || "None",
        confidence: Number(source.confidence || 0),
        clarity: Number(source.clarity || 0),
        engagement: Number(source.engagement || 0),
        paceStatus: source.pace_status || "Optimal",
        source: "store.json-migration",
        recordedAt: source.date ? new Date(source.date) : new Date()
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  for (const source of store.debateHistory || []) {
    const user = userMap.get(Number(source.user_id));
    await DebateHistory.findOneAndUpdate(
      { legacyId: Number(source.id) || undefined },
      {
        legacyId: Number(source.id) || undefined,
        userId: user?._id || null,
        legacyUserId: Number(source.user_id) || undefined,
        userEmail: source.user_email || user?.email || null,
        userName: source.user_name || user?.name || "Debater",
        topic: source.topic || "Debate Session",
        format: source.format || "Oxford Debate",
        position: source.position || "Affirmative",
        opponentPersona: source.opponent_persona,
        score: Number(source.score || 0),
        status: source.status || "Completed",
        date: source.date,
        completedAt: source.completed_at ? new Date(source.completed_at) : new Date(),
        fallacies: source.fallacies || [],
        transcript: source.transcript || [],
        scores: source.scores || {},
        executiveSummary: source.executive_summary,
        verdict: source.verdict,
        strengths: source.strengths || [],
        areasForImprovement: source.areas_for_improvement || [],
        coachingReview: source.coaching_review,
        source: "store.json-migration"
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  await mongoose.connection.collection("legacy_store_snapshots").updateOne(
    { source: "frontend/data/store.json" },
    { $set: { source: "frontend/data/store.json", migratedAt: new Date(), data: store } },
    { upsert: true }
  );

  console.log(`Migrated ${store.users?.length || 0} users, ${store.presentationHistory?.length || 0} presentations, and ${store.debateHistory?.length || 0} debates.`);
  console.log("Remaining JSON sections were preserved in legacy_store_snapshots.");
  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error("Migration failed:", error);
  try { await mongoose.disconnect(); } catch {}
  process.exitCode = 1;
});
