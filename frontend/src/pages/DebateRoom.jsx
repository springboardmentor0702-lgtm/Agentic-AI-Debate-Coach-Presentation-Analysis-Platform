import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Spinner, { LoadingBlock } from "../components/Spinner";
import VoiceInputButton from "../components/VoiceInputButton";
import SpeakButton from "../components/SpeakButton";
import GlassCard from "../components/ui/GlassCard";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";

function RoundTimer({ seconds, active }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    if (!active) return;
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, active]);

  if (!active) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return (
    <span className={`font-mono text-sm ${remaining < 30 ? "text-danger" : "text-faint"}`}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      {remaining === 0 && " — take your time, this isn't enforced"}
    </span>
  );
}

function RoundCard({ round, isCreator, myLabel, opponentLabel }) {
  const feedback = round.judge_feedback;
  // Guard against Postgres's own default value: an unjudged round's
  // judge_feedback column defaults to {} (empty object), which is
  // truthy in JavaScript - checking just `feedback` was rendering a
  // premature, wrong "winner" for a round nobody had judged yet. The
  // real signal that a round has actually been judged is round_winner
  // being present, not just the column being non-null.
  const hasFeedback = feedback && feedback.round_winner;
  const iWon = hasFeedback && (feedback.round_winner === "user") === isCreator;

  return (
    <GlassCard className="p-4">
      <p className="font-mono text-xs text-faint uppercase tracking-wide mb-3">
        Round {round.round_number}
      </p>

      <div className="space-y-3 mb-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="font-mono text-[10px] text-accent uppercase tracking-wide">
              {isCreator ? myLabel : opponentLabel} — opened
            </p>
            <SpeakButton text={round.user_argument} />
          </div>
          <p className="text-sm">{round.user_argument}</p>
        </div>
        {round.opponent_argument && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="font-mono text-[10px] text-accent uppercase tracking-wide">
                {isCreator ? opponentLabel : myLabel} — responded
              </p>
              <SpeakButton text={round.opponent_argument} />
            </div>
            <p className="text-sm">{round.opponent_argument}</p>
          </div>
        )}
      </div>

      {hasFeedback && (
        <div className="border-t border-glass-border pt-3 mt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="font-mono text-xs uppercase tracking-wide text-faint">
              {feedback.round_winner === "tie" ? "Tie" : iWon ? "You won this round" : "Opponent won this round"}
            </p>
            <SpeakButton text={feedback.feedback} />
          </div>
          <p className="text-sm mb-1">{feedback.feedback}</p>
          {feedback.key_moment && (
            <p className="text-xs text-faint italic">{feedback.key_moment}</p>
          )}
        </div>
      )}

      {!round.opponent_argument && (
        <p className="text-xs text-faint italic border-t border-glass-border pt-3 mt-3">
          Waiting for a response to this round.
        </p>
      )}
    </GlassCard>
  );
}

export default function DebateRoom() {
  const { id } = useParams();
  const { profile } = useAuth();

  const [session, setSession] = useState(null);
  const [formatConfig, setFormatConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [argument, setArgument] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [respondingInvite, setRespondingInvite] = useState(false);
  const [ending, setEnding] = useState(false);

  // Whether the creator has explicitly chosen to continue past the
  // last judged round. Resets every time a new round actually starts,
  // so the choice has to be made fresh each time rather than "sticking."
  const [wantsNextRound, setWantsNextRound] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get(`/debates/sessions/${id}`)
      .then((res) => setSession(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load this debate."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api
      .get("/debates/formats")
      .then((res) => setFormatConfig(res.data))
      .catch(() => setFormatConfig([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Every time a round is actually added, the "continue?" decision
  // resets - the previous answer shouldn't carry forward to the next
  // decision point.
  useEffect(() => {
    setWantsNextRound(false);
  }, [session?.rounds?.length]);

  const handleRespondInvite = async (accept) => {
    setRespondingInvite(true);
    try {
      await api.post(`/debates/sessions/${id}/respond`, { accept });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not respond to that invite.");
    } finally {
      setRespondingInvite(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      await api.post(`/debates/sessions/${id}/rounds`, { user_argument: argument });
      setArgument("");
      load();
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Could not submit that argument.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndDebate = async () => {
    if (!window.confirm("End this debate now? This can't be undone.")) return;
    setEnding(true);
    try {
      await api.post(`/debates/sessions/${id}/end`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not end this debate.");
    } finally {
      setEnding(false);
    }
  };

  if (loading) return <LoadingBlock />;
  if (error) {
    return (
      <div>
        <p className="text-sm text-danger mb-4">{error}</p>
        <Link to="/debates" className="font-mono text-xs text-faint hover:text-ink">
          ← Back to debates
        </Link>
      </div>
    );
  }
  if (!session) return null;

  const isHuman = session.mode === "human_vs_human";
  const isCreator = profile?.id === session.user_id;
  const rounds = session.rounds || [];
  const lastRound = rounds[rounds.length - 1];
  const roundOpen = lastRound && !lastRound.opponent_argument;

  // Whose turn it is in human-vs-human mode: whoever hasn't spoken yet
  // in the currently-open round, or the creator if no round is open
  // (they always open a fresh round).
  const myTurn = isHuman && (roundOpen ? !isCreator : isCreator);

  const pendingInviteForMe = isHuman && session.invite_status === "pending" && !isCreator;
  const waitingOnInviteAsCreator = isHuman && session.invite_status === "pending" && isCreator;
  const inviteDeclined = isHuman && session.invite_status === "declined";
  const isCompleted = session.status === "completed";
  const activeFormat = formatConfig?.find((f) => f.key === session.format);
  // A real, user-chosen round count (Segment 28 addition) takes
  // priority over the format's suggested default - only sessions
  // created before this feature existed fall back to the old
  // format-suggested behavior, unchanged.
  const hasCustomTarget = session.rounds_target != null;
  const roundsTarget = session.rounds_target ?? activeFormat?.rounds_target ?? 3;
  const myWins = isCreator ? session.user_wins : session.opponent_wins;
  const theirWins = isCreator ? session.opponent_wins : session.user_wins;

  // The last round is fully judged once judge_feedback actually has a
  // round_winner - not just truthy, since an unjudged row defaults to
  // {} in the database, which is truthy in JS (the same bug class
  // fixed in RoundCard above).
  const lastRoundJudged = Boolean(lastRound && lastRound.judge_feedback && lastRound.judge_feedback.round_winner);

  // Only the person who'd open the NEXT round faces this decision - in
  // human-vs-human mode that's always the creator; in AI mode it's
  // always "you," since there's no separate opponent turn.
  const needsContinueDecision = Boolean(
    !isCompleted && rounds.length > 0 && lastRoundJudged && !roundOpen && (!isHuman || isCreator)
  );
  const targetReached = rounds.length >= roundsTarget;

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/debates" className="font-mono text-xs text-faint hover:text-ink transition-colors">
        ← All debates
      </Link>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl mt-4 mb-1">{session.topic}</h1>
        <p className="text-faint mb-1">
          {session.user_position} vs. {session.ai_position} ·{" "}
          {isHuman ? "Human opponent" : "AI opponent"}
        </p>
        {rounds.length > 0 && (
          <p className="font-mono text-xs text-faint uppercase tracking-wide mb-8">
            Round {rounds.length} of {roundsTarget}{hasCustomTarget ? "" : " (suggested)"} · You: {myWins ?? 0} ·{" "}
            {isHuman ? "Opponent" : "AI"}: {theirWins ?? 0}
            {isCompleted && " · Debate ended"}
          </p>
        )}
        {rounds.length === 0 && <div className="mb-8" />}
      </motion.div>

      {isCompleted && (
        <GlassCard className="p-5 mb-8 text-center">
          <p className="font-mono text-xs text-faint uppercase tracking-wide mb-1">
            Final result
          </p>
          <p className="font-display text-2xl text-accent">
            {myWins === theirWins
              ? "Tie"
              : myWins > theirWins
              ? "You won overall"
              : "You lost overall"}
          </p>
          <p className="text-sm text-faint mt-1">
            {myWins ?? 0} - {theirWins ?? 0}
          </p>
        </GlassCard>
      )}

      {pendingInviteForMe && (
        <GlassCard className="p-5 mb-8 !border-accent/40">
          <p className="text-sm mb-4">You've been invited to this debate. Join in?</p>
          <div className="flex items-center gap-3">
            <GlassButton onClick={() => handleRespondInvite(true)} variant="primary" disabled={respondingInvite}>
              Accept
            </GlassButton>
            <button
              onClick={() => handleRespondInvite(false)}
              disabled={respondingInvite}
              className="font-mono text-xs uppercase tracking-wide text-faint hover:text-danger transition-colors"
            >
              Decline
            </button>
          </div>
        </GlassCard>
      )}

      {waitingOnInviteAsCreator && (
        <p className="text-sm text-faint border border-glass-border rounded-2xl bg-glass backdrop-blur-xl p-4 mb-8">
          Waiting for your opponent to accept this invite.
        </p>
      )}

      {inviteDeclined && (
        <p className="text-sm text-faint border border-glass-border rounded-2xl bg-glass backdrop-blur-xl p-4 mb-8">
          This invite was declined.
        </p>
      )}

      {rounds.length > 0 && (
        <div className="space-y-4 mb-8">
          {rounds.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.06, 0.4) }}
            >
              <RoundCard
                round={r}
                isCreator={isCreator}
                myLabel="You"
                opponentLabel={isHuman ? "Opponent" : "AI"}
              />
            </motion.div>
          ))}
        </div>
      )}

      {needsContinueDecision && !wantsNextRound && (
        <GlassCard className="p-5 mb-8 text-center !border-accent/40">
          <p className="text-sm mb-4">
            {targetReached
              ? `Round ${rounds.length} complete — you've reached the suggested length for this format (${roundsTarget} rounds).`
              : `Round ${rounds.length} complete.`}
          </p>
          <div className="flex items-center justify-center gap-3">
            <GlassButton onClick={() => setWantsNextRound(true)} variant="primary">
              {targetReached ? "One more round" : `Continue to round ${rounds.length + 1}`}
            </GlassButton>
            <GlassButton onClick={handleEndDebate} variant="glass" disabled={ending}>
              {ending ? "Ending..." : "End debate now"}
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {(!isHuman || (session.invite_status === "accepted" && (myTurn || !roundOpen))) &&
        !inviteDeclined &&
        !isCompleted &&
        (!needsContinueDecision || wantsNextRound) && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {isHuman && !myTurn && (
              <p className="text-sm text-faint italic">
                Waiting for your opponent to respond to the current round.
              </p>
            )}
            {(!isHuman || myTurn) && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-faint uppercase tracking-wide">
                    {roundOpen ? "Your response" : `Round ${rounds.length + 1}`}
                  </span>
                  {formatConfig && formatConfig.length > 0 && (
                    <RoundTimer
                      seconds={
                        formatConfig.find((f) => f.key === session.format)?.round_seconds || 180
                      }
                      active={true}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <GlassField
                    multiline
                    required
                    rows={6}
                    value={argument}
                    onChange={(e) => setArgument(e.target.value)}
                    placeholder="Make your case for this round, or use voice input below..."
                  />
                  <div className="flex items-center justify-between">
                    <VoiceInputButton
                      onTranscript={(spoken) =>
                        setArgument((prev) => (prev ? `${prev} ${spoken}` : spoken))
                      }
                    />
                    <SpeakButton text={argument} label="Read back what you've written" />
                  </div>
                </div>
                {submitError && <p className="text-sm text-danger">{submitError}</p>}
                <GlassButton type="submit" variant="primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Spinner size={12} className="border-surface/40 border-t-surface" />
                      Submitting...
                    </>
                  ) : (
                    "Submit argument"
                  )}
                </GlassButton>
              </>
            )}
          </form>
        )}

      {rounds.length > 0 && !isCompleted && (
        <div className="mt-8 pt-6 border-t border-glass-border">
          <GlassButton onClick={handleEndDebate} variant="glass" disabled={ending}>
            {ending ? "Ending..." : "End debate now"}
          </GlassButton>
          <p className="text-xs text-faint mt-2">
            {hasCustomTarget
              ? `Either side can end it whenever you've both said enough — ${roundsTarget} rounds was the chosen target, but it's not enforced.`
              : `Either side can end it whenever you've both said enough — there's no enforced round limit, ${roundsTarget} is just a suggested length for this format.`}
          </p>
        </div>
      )}
    </div>
  );
}
