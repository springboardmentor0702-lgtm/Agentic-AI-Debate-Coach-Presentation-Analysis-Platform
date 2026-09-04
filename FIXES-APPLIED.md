# Fixes applied in this build

## AI provider reliability
- Groq remains the primary provider.
- The default Groq model is `qwen/qwen3.8-27b`.
- If the configured Groq model returns HTTP 404, the backend queries Groq's model list and retries with an active text model before falling back.
- Structured AI endpoints request JSON mode from providers where supported.
- Gemini remains the second provider and Demo is the final deterministic fallback.
- Provider secrets remain backend-only and are not packaged.

## AI Practice vs Debates
- **AI Practice** is now a dedicated practice workflow with an AI opponent, immediate assessment, and coaching hand-off.
- **Debates** is now the learner's debate activity/history area with a separate "Start new debate" flow and replay access.
- The two pages no longer render the exact same screen.

## Live Arena
- Live Arena is explicitly human-vs-human.
- Accepted friends are required before an invitation can be sent.
- Pending invitations can be accepted/declined in Live Arena.
- Accepted invitations expose the room code and allow WebSocket connection.
- Connection errors are surfaced instead of silently doing nothing.
- Live messages are persisted and broadcast to connected participants.

## Presentations
- Slide text is no longer presented as if it were the learner's speech.
- "What you actually said" comes only from captured/entered speech.
- Delivery metrics are `Unavailable` when speech was not captured; they are never fabricated.
- Presentation scores are no longer fixed demo values.
- An analyzed presentation now creates a real stored `Score`, so presentation results contribute to Analytics/Performance.
- Analytics separates debate and presentation trends.

## Coaching and data integrity
- Learning plans require a real assessment first.
- Learning-plan focus is derived from the user's weakest stored skills rather than a fixed pretend history.
- Debate finishing is idempotent so repeated clicks do not create duplicate scores.

## Verification
- Backend Python compilation passes.
- Backend test suite passes: **6/6 tests**.
- Docker image build was not run in this packaging environment because Docker is unavailable here; the supplied Dockerfiles/compose configuration remain the execution path on the user's machine.
