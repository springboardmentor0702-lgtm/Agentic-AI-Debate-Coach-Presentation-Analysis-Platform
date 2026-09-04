import { Trash2, Download } from "lucide-react";
import { LoadingBlock } from "./Spinner";
import SpeakButton from "./SpeakButton";

/**
 * Reusable "past runs" panel used by every single-shot tool page
 * (Argument Analysis, Fallacy Detection, Counterarguments, Full Case
 * Review, Presentation Analysis, Coaching Plan, Debate Prep Research,
 * Ask Your Coach). Click an item to load it into the main view; hover
 * to reveal delete (and, if the page passes `onDownload`, a per-item
 * PDF download) buttons.
 *
 * Each page supplies its own `renderSummary(item)` since every tool's
 * data shape is different - this component only handles the shared
 * list/select/delete/download chrome.
 *
 * `getSpeakText(item)` (optional): returns the text a per-item "read
 * aloud" button should speak. Omit it and no speaker icon renders for
 * this list at all - existing call sites that don't pass it keep
 * looking and behaving exactly as before.
 *
 * Segment 28g: moved to the glass card treatment now that every call
 * site above has been migrated - no page left where this would leak
 * the new look somewhere not ready for it.
 */
export default function HistoryPanel({
  title,
  items,
  loading,
  activeId,
  onSelect,
  onDelete,
  onDownload,
  renderSummary,
  emptyMessage,
  getSpeakText,
}) {
  return (
    <div className="border border-glass-border rounded-2xl bg-glass backdrop-blur-xl overflow-hidden">
      <p className="font-mono text-xs tracking-widest text-faint uppercase px-4 py-3 border-b border-glass-border">
        {title}
      </p>
      <div className="max-h-[36rem] overflow-y-auto divide-y divide-glass-border">
        {loading ? (
          <div className="px-4 py-6"><LoadingBlock /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-faint px-4 py-6">
            {emptyMessage || "Nothing here yet."}
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`group flex items-start gap-2 px-4 py-3 cursor-pointer transition-colors ${
                activeId === item.id ? "bg-accent-soft" : "hover:bg-glass-strong"
              }`}
              onClick={() => onSelect(item)}
            >
              <div className="flex-1 min-w-0">{renderSummary(item)}</div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                {getSpeakText && <SpeakButton text={getSpeakText(item)} />}
                {onDownload && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(item);
                    }}
                    aria-label="Download this entry as a PDF"
                    className="text-faint hover:text-accent transition-colors"
                  >
                    <Download size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                  }}
                  aria-label="Delete this entry"
                  className="text-faint hover:text-danger transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
