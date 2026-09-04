# ClashLab — Full Manual Test Plan

Covers every feature through Segment 26, organized by role. Each test
gives you real sample text to paste in — not placeholder junk — so
the AI produces meaningful output you can actually judge.

---

## 0. Setup

1. **Wipe** (optional): `WIPE_OPTIONS.sql` — pick Option A (keep your
   own login, clear data) or Options B+C together (nuke everything,
   including your own account, for a truly fresh start). Skip this
   entirely if you're unsure.
2. **Seed**: copy `seed_dummy_data.py` into `backend/scripts/`, run
   `python scripts/seed_dummy_data.py` from the `backend` folder with
   your venv active.
3. **Every seeded account uses the password**: `SeedTest123`

| Role | Login |
|---|---|
| Admin | `admin@seed.test` |
| Debate Coach | `coach@seed.test` |
| Educator | `educator@seed.test` |
| Learner (full data, 5-day streak) | `learner1@seed.test` — Alex Chen |
| Learner (2-day streak) | `learner3@seed.test` — Jordan Lee |
| Learner (pending invite sent) | `learner3@seed.test` — Jordan Lee |
| Learner (pending invite received) | `learner4@seed.test` — Casey Kim |
| Learner (no username, sparse data) | `learner6@seed.test` — Morgan Diaz |
| Learner (completed HvH debate) | `learner7@seed.test` / `learner8@seed.test` |

---

## 1. Learner role

### Argument Analysis (`/analyze`)

Paste this (a clean, well-evidenced argument):

> Social media platforms should be regulated because they have unprecedented influence over public discourse without corresponding accountability. A 2021 study by the Pew Research Center found that 64% of Americans believe social media has a mostly negative effect on the country, largely due to the spread of misinformation. Traditional broadcast media faces content standards and can lose licenses for violations, yet social media platforms operate with far less oversight despite reaching billions of users daily. Requiring these platforms to meet baseline transparency standards around algorithmic amplification and content moderation would not eliminate free expression, but would create the same kind of accountability we already expect from other powerful media institutions.

Topic field: `Social media regulation`

**Verify**: scores across all 5 dimensions, at least 1-2 strengths and
weaknesses, claims identified with evidence strength ratings.

**Also test**: click "Voice input," speak a sentence, confirm it
appends to the box without erasing what's there. Try the search box
and "Practice again ↻" on a past history item.

### Fallacy Detection (`/fallacies`)

Paste this (deliberately contains several real fallacies):

> Anyone who opposes regulating social media clearly doesn't care about protecting children online. Senator Martinez opposed the bill, but he also failed his ethics review last year, so his judgment on this issue can't be trusted anyway. Besides, if we don't regulate social media right now, before we know it there will be no privacy left at all for anyone, ever. Everyone I know agrees these companies need to be controlled, so it must be the right thing to do.

**Verify**: should catch at least an ad hominem (the senator's ethics
review), a slippery slope ("before we know it..."), and an appeal to
popularity ("everyone I know agrees").

### Counterarguments (`/counterarguments`)

Paste the same clean argument from Argument Analysis above.

**Verify**: multiple counterarguments with rationale, challenge
questions, alternative perspectives, strategy suggestions.

### Full Case Review (`/case-review`)

Paste the same clean argument again.

**Verify** (this is the module that was recently fixed for
sparseness): you should now see the **complete** breakdown from all
three sub-tools — full scores and claims from Argument Analysis, the
actual fallacy list (or "none detected") from Fallacy Detection, and
the full counterargument list — not one-line summaries. Plus an
"Overall Verdict" synthesis at the end.

### Presentation Analysis (`/presentation`)

Either record with your mic, or paste this directly into the
transcript box (it accepts typed/pasted text too):

> So, um, basically, I think that, like, social media regulation is a really important issue that we need to think about, you know, carefully. I mean, there's a lot of, um, evidence that shows social media has both good and bad effects on society, and, uh, we need to find, like, a balanced approach that protects people without, um, going too far.

**Verify**: filler word count should be noticeably high given the
sample, pace/wpm shown, scores for confidence/clarity/engagement.

### Debate Prep Research (`/research`)

Topic: `Universal basic income` — Position: `For`

**Verify**: shows how many searches the agent ran (varies — that's
the point, it's not fixed), the actual queries it chose, key facts
with real Wikipedia links, counter-evidence, a suggested angle. Try a
second, more obscure topic and see if the agent behaves differently
(fewer/no useful results) without crashing.

### Coaching Plan (`/coaching`)

Click "Generate coaching plan" — no input needed, it uses your actual
performance history.

**Verify**: recommendations tied to your weakest scored areas, each
with a "Practice this →" link that lands you on the right tool.

### Ask Your Coach (`/coaching-agent`) — the agentic one

Try several different questions to see the agent's tool choice vary:

- `What should I focus on to improve?` (likely checks performance history)
- `Do I have any goals right now?` (likely checks active goals)
- `How do I write a stronger rebuttal?` (likely searches coaching knowledge)

**Verify**: "What the agent checked" shows different tools for
different questions — that's the actual point of this feature, not a
fixed script. If a goal gets proposed, click "Accept this goal" and
confirm it shows up on `/goals` afterward. Confirm the question box
clears after sending and a brief "Sent ✓" appears.

### AI Debate Simulation (`/debates`)

Create a session, leave "Opponent" blank (debates the AI), position
`For`, topic: `This house would ban single-use plastics entirely`.

Round 1 argument:
> Single-use plastics should be banned because they persist in the environment for centuries and are directly responsible for the deaths of over a million marine animals annually. Biodegradable alternatives already exist at scale for most common uses — packaging, cutlery, bags — so the transition cost is far lower than opponents claim.

**Verify**: the AI generates a counter-argument and judges the round
immediately (single call, unlike human-vs-human). Try "Voice input"
on the argument box too. Submit 2-3 rounds, then click "End debate
now" and confirm the final tally and result match what actually
happened.

### Human-vs-Human Debate

You have 4 seeded examples in different states — check each:

1. **Pending invite you sent**: log in as `learner3@seed.test`, go to
   `/debates`, confirm you see it listed as "invite pending."
2. **Pending invite you received**: log in as `learner4@seed.test`,
   confirm it shows under "Debate invites" at the top with Accept/Decline.
   Accept it, then submit an opening argument.
3. **Accepted, in-progress**: log in as `learner1@seed.test` or
   `learner2@seed.test` (Alex Chen / Sam Rivera) — one round already
   judged, confirm you can submit the next round in the right order
   (creator opens, opponent responds).
4. **Completed with a tie**: log in as `learner7@seed.test` or
   `learner8@seed.test` — confirm the final result correctly shows a
   mixed/tied outcome, not a clean win for either side.

### Performance Score (`/performance`) & Dashboard (`/dashboard`)

No input needed — just verify: overall score, per-skill bars, trend
chart showing real movement over time (check `learner1@seed.test`
specifically — has the richest history), streak badge showing a 5-day
streak, recent activity feed, active goals.

### Goals (`/goals`)

Create a new goal manually: metric `Rebuttal Effectiveness`, target
`8.0`. Confirm it shows progress against your current score.

### Peer Comparison (`/comparison`)

Login as any learner except `learner8@seed.test` (the one deliberately
held out). **Verify**: percentile shown, never another learner's name
or exact score.

### Topic Library (`/topics`)

Browse by category, click "Surprise me," confirm it lands you on
Debates with that topic pre-filled.

### Reports & Export

Download a per-item PDF from any tool's history. Then hit the data
export (`GET /export/me` if there's no button wired up yet) and
confirm the JSON has real data across every table you've touched.

### Edit Profile (`/profile`)

Change your username to something new — confirm the format validation
rejects `ab` (too short) and accepts `test_user1`. Try changing your
password to `weakpass` (should fail the checklist) then to
`StrongPass123` (should succeed).

### Theme toggle & sidebar

Toggle dark/light from the sidebar footer — confirm the label always
matches what's *currently* active, not the destination. Confirm the
"Dashboard" link works, and that scrolling a long page doesn't drag
the sidebar's footer out of view.

---

## 2. Debate Coach role (`coach@seed.test`)

### Coach Dashboard (`/coach-dashboard`)

Confirm all 8 learners appear, ranked by score.

### Learner Detail

Click into `Jordan Lee` (has a coach-assigned goal already). Leave new
feedback on one of their activity items — confirm the page doesn't
reload, a "Sent ✓" appears, and it shows up in "Feedback given"
immediately. Click that feedback entry and confirm it scrolls to/
highlights the matching activity item above.

Assign a new goal: metric `Logical Consistency`, target `7.0`.

Suggest a topic: `This house believes zoos do more harm than good` —
confirm the learner gets a notification linking to a pre-filled debate
form.

### Classes (`/classes`)

Open "Varsity Debate - Fall" (has 5 members already). Remove one
learner, add a different one back. Download the class report PDF.
Check the class trend chart.

---

## 3. Educator role (`educator@seed.test`)

Same feature set as Debate Coach — the meaningful difference is
framing (class-centric vs. individual-centric), not different
capabilities. Create your own class here to confirm it's independent
of the coach's class.

---

## 4. Admin role (`admin@seed.test`)

### User Management (`/admin-dashboard`)

Create a brand-new test account (any role). Edit an existing learner's
experience level. Try changing your own email/password (should be
blocked — self-edit protection).

### AI Model Monitoring

Confirm Gemini/Groq success/failure counters show real numbers after
you've used a few AI tools in this session.

### Settings

Change the Peer Comparison minimum pool size, confirm it persists
after a refresh.

---

## What "everything works" looks like when you're done

- Every one of the 9 AI-backed tools produces real, sensible output
  from the sample text above.
- Both debate modes (AI and human-vs-human) can go from creation
  through judged rounds to a final result.
- All 4 roles can log in and reach every page meant for them, and
  *only* those pages.
- Dashboards and charts show real movement, not empty states, for
  `learner1@seed.test` specifically.
- Voice input works on every text tool it's been added to (Chrome/Edge).
