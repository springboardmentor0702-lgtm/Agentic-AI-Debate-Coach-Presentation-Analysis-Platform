import SpeakButton from "./SpeakButton";

/**
 * Shows the full text you originally submitted, at the top of every
 * result view - open by default, never truncated. Fixes the bug where
 * loading a past entry only showed the AI's analysis with no way to
 * see what you'd actually written, especially painful for long
 * submissions. Scrolls internally past a certain height instead of
 * growing the whole page unboundedly, but nothing is ever cut off -
 * you can always scroll to see the rest.
 */
export default function OriginalSubmission({ text, label = "Your submission" }) {
  if (!text) return null;
  return (
    <details className="border border-glass-border rounded-2xl bg-glass backdrop-blur-xl group mb-8" open>
      <summary className="flex items-center justify-between gap-2 font-mono text-xs tracking-widest text-faint uppercase px-4 py-3 cursor-pointer select-none group-open:border-b group-open:border-glass-border">
        {label}
        <SpeakButton text={text} />
      </summary>
      <div className="p-4 max-h-72 overflow-y-auto">
        <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    </details>
  );
}
