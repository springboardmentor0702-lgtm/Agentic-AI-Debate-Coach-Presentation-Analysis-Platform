# ARGUAI — Learner Phase

This phase starts from the original `ARGUAI-FINAL-WORKING` project and changes the learner experience only. Coach, Educator and Administrator workflows are intentionally not redesigned in this phase.

## Learner changes

- Removed the duplicate **AI Practice** learner navigation entry.
- Kept **Debates** as the AI debate workspace: every format is AI-vs-learner; there is no second human speaker in these formats.
- Added format-specific AI behavior for:
  - One-to-One AI Debate
  - AI Debate Simulation
  - Parliamentary AI Debate
  - Oxford AI Debate
  - Policy AI Debate
  - Public Forum AI Debate
- Each AI debate format now carries its own role framing, speaking sequence, rules and evaluation framing into the AI opponent and assessment prompts.
- Kept **Live Arena** separate for human-vs-human live debating.
- Added **Full Case Review** as a separate complete case-level analysis module.
- Reworked Argument Analysis, Fallacy Detection and Counterarguments into readable result cards instead of raw JSON output.
- Fallacy analyses are logged so learner fallacy frequency can be derived from actual submitted analyses.
- Presentation analysis now exposes confidence and clarity estimates only when speech was actually captured; no speech is assumed from slide text.
- Added a browser microphone level meter during presentation speech capture.
- Preserved per-slide speech capture and slide-by-slide workflow.
- Expanded learner analytics data with separate argument, counterargument and presentation trend series.
- Dashboard now surfaces actual daily streak, strongest/weakest core skill, today's goal and recent activity alongside the main metrics.
- Debate assessment now displays score bars and a focused top-3 coaching target list.
- AI coaching continues to consume stored learner analytics rather than fabricated history.

## Data integrity

- No learner activity is seeded as fake history.
- Scores remain tied to submitted debate/presentation activity.
- If speech is unavailable, the UI says so rather than treating slide text as spoken speech.
- Demo Mode remains a provider fallback and is visibly identified by the existing provider label; it does not create fake learner history.

## Verification

Backend test suite: **6 passed**.

The environment used for this build did not contain frontend `node_modules`, so a frontend production build was not claimed as verified.

## Learner Final Polish Update
- Added a readable Dashboard **Learner Growth Map** using only stored Presentation, Argument and Counterargument assessment records.
- Improved Skill DNA visualization and real-data empty states.
- Added Live Arena **FOR/AGAINST** selection, opposite-position assignment, explicit **End debate & see results**, and transcript-based human-vs-human performance comparison.
- Live Arena referee results now show winner, both participant scores, dimensions, strengths and weaknesses and persist assessment scores.
- Added readable learner report previews and redesigned PDF/Excel report generation for Performance, Debate and Presentation reports.
- Presentation analysis now persists analyzed slide-level speech evidence for reporting.
- Added learner Settings with appearance, learning reminder preference, data-integrity and AI-provider information.
- Added Nginx `client_max_body_size 55M` for PPTX uploads.
- Backend regression tests: 6 passed.
- Frontend build was not executed because this environment has no installed `node_modules`; do not claim a local production build was verified.
