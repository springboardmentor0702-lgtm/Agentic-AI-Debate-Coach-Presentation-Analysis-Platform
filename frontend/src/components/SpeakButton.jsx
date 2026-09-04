import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Reads `text` aloud via the browser's built-in SpeechSynthesis API -
 * the same category of Web Speech API as VoiceInputButton (which uses
 * SpeechRecognition for input), just the output direction instead.
 * Purely additive: doesn't read from or write to any app state, so it
 * can be dropped anywhere there's text without touching the logic
 * around it.
 *
 * Only one utterance can ever play across the whole app at a time -
 * starting a new one always cancels whatever was speaking before,
 * which also correctly resets that other button's icon back to idle
 * via its own onend/onerror handlers.
 *
 * Renders nothing if the browser doesn't support speech synthesis, or
 * if there's no text to read - never an inert or confusing button.
 */
export default function SpeakButton({ text, className = "", size = 14, label = "Read aloud" }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const utteranceRef = useRef(null);

  useEffect(() => {
    return () => {
      // If this exact utterance is still the one active when the
      // button unmounts (e.g. navigating away mid-sentence), stop it
      // rather than leaving it talking over the next page.
      if (utteranceRef.current && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported || !text || !text.trim()) return null;

  const handleClick = (e) => {
    // preventDefault matters specifically when this sits inside a
    // <summary> (like OriginalSubmission) - without it, the click
    // would also toggle the details open/closed. stopPropagation
    // matters when this sits inside a clickable row (a history item).
    e.preventDefault();
    e.stopPropagation();
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      utteranceRef.current = null;
      return;
    }
    // Only one utterance plays at a time app-wide - cancel anything
    // else first so this one doesn't queue up behind it.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isSpeaking ? "Stop reading" : label}
      aria-label={isSpeaking ? "Stop reading" : label}
      className={className || "text-faint hover:text-accent transition-colors shrink-0"}
    >
      {isSpeaking ? <VolumeX size={size} /> : <Volume2 size={size} />}
    </button>
  );
}
