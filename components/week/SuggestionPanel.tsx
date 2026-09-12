"use client";

import { SUGGESTION_PAGE_SIZE, suggest, type Suggestion } from "@/lib/rules";
import type { Meal } from "@/types/meal";
import type { Slot, Week } from "@/types/week";

type Props = {
  slot: Slot;
  week: Week;
  wave: "first" | "more";
  morePage: number;
  onSelect: (meal: Meal, alreadyUsed: boolean) => void;
  onMore: () => void;
  onBack: () => void;
};

export function SuggestionPanel({
  slot,
  week,
  wave,
  morePage,
  onSelect,
  onMore,
  onBack,
}: Props) {
  const suggestions: Suggestion[] =
    wave === "first"
      ? suggest({ slot, week, wave: "first" })
      : suggest({ slot, week, wave: "more", page: morePage });

  const exhausted =
    wave === "more" && suggestions.length === 0;

  return (
    <div className="suggestion-panel">
      <div className="sheet-toolbar">
        <button type="button" className="btn-text" onClick={onBack}>
          ← Back to slot
        </button>
      </div>
      <h3 className="sheet-section-title">Pick a dish</h3>
      {wave === "first" && suggestions.length === 0 ? (
        <p className="muted">No suggestions for this slot.</p>
      ) : null}
      <ul className="suggestion-list">
        {suggestions.map(({ meal, alreadyUsedThisWeek }) => (
          <li key={meal.id}>
            <button
              type="button"
              className="suggestion-btn"
              onClick={() => onSelect(meal, alreadyUsedThisWeek)}
            >
              <span className="suggestion-name">{meal.name}</span>
              {alreadyUsedThisWeek ? (
                <span className="badge-used">Used this week</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {exhausted ? (
        <p className="muted">No more dishes in the catalog.</p>
      ) : (
        <button type="button" className="btn btn-block" onClick={onMore}>
          Generate More
        </button>
      )}
      <p className="hint">
        Showing up to {SUGGESTION_PAGE_SIZE} dishes per page from the meal catalog.
      </p>
    </div>
  );
}
