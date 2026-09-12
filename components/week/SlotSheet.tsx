"use client";

import { CLIENT_PERSIST_OPTIONS } from "@/lib/push";
import { applySlotSuggestion, clearWeekSlot, removeSlotItem, updateSlotInstructions, updateSlotItem } from "@/lib/store";
import { displayTitle } from "@/lib/message";
import { slotShortLabel } from "@/lib/ui/slotLabel";
import type { Slot, Week } from "@/types/week";
import { useCallback, useState } from "react";
import { SuggestionPanel } from "./SuggestionPanel";

type Props = {
  week: Week;
  slot: Slot;
  onWeekChange: (week: Week) => void;
  onClose: () => void;
  onSlotDecidedFromUndecided: (slotId: string) => void;
};

type View = "edit" | "suggestions";

export function SlotSheet({
  week,
  slot,
  onWeekChange,
  onClose,
  onSlotDecidedFromUndecided,
}: Props) {
  const [view, setView] = useState<View>("edit");
  const [suggestionWave, setSuggestionWave] = useState<"first" | "more">("first");
  const [morePage, setMorePage] = useState(1);
  const [reuseWarning, setReuseWarning] = useState<string | null>(null);

  const persist = useCallback(
    (next: Week) => {
      onWeekChange(next);
    },
    [onWeekChange],
  );

  const storeOpts = CLIENT_PERSIST_OPTIONS;

  function openSuggestions() {
    setSuggestionWave("first");
    setMorePage(1);
    setReuseWarning(null);
    setView("suggestions");
  }

  function handleSelect(meal: Parameters<typeof applySlotSuggestion>[2], alreadyUsed: boolean) {
    const wasUndecided = slot.slotStatus === "UNDECIDED";
    const next = applySlotSuggestion(week, slot.id, meal, CLIENT_PERSIST_OPTIONS);
    persist(next);
    if (wasUndecided) {
      onSlotDecidedFromUndecided(slot.id);
    }
    if (alreadyUsed) {
      setReuseWarning(`${meal.name} is already on the menu this week.`);
    } else {
      setReuseWarning(null);
    }
    setView("edit");
  }

  function handleClear() {
    if (!window.confirm("Clear this slot? It will be undecided and may trigger reminders.")) {
      return;
    }
    persist(clearWeekSlot(week, slot.id, CLIENT_PERSIST_OPTIONS));
    setReuseWarning(null);
    onClose();
  }

  if (view === "suggestions") {
    return (
      <div className="sheet" role="dialog" aria-label={`Suggestions for ${slotShortLabel(slot)}`}>
        <SuggestionPanel
          slot={slot}
          week={week}
          wave={suggestionWave}
          morePage={morePage}
          onSelect={handleSelect}
          onBack={() => setView("edit")}
          onMore={() => {
            if (suggestionWave === "first") {
              setSuggestionWave("more");
              setMorePage(1);
            } else {
              setMorePage((page) => page + 1);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="sheet" role="dialog" aria-label={`Edit ${slotShortLabel(slot)}`}>
      <div className="sheet-header">
        <h2 className="sheet-title">{slotShortLabel(slot)}</h2>
        <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <p className="sheet-date muted">{slot.date}</p>
      {reuseWarning ? <p className="banner-warn">{reuseWarning}</p> : null}

      <div className="sheet-section">
        <h3 className="sheet-section-title">Dishes</h3>
        {slot.items.length === 0 ? (
          <p className="muted">No dishes yet. Add from the catalog.</p>
        ) : (
          <ul className="item-edit-list">
            {slot.items.map((item, index) => (
              <li key={`${item.mealId}-${index}`} className="item-edit-card">
                <p className="item-kind">{item.kind}{item.paired ? " (paired)" : ""}</p>
                <label className="field">
                  <span>Title</span>
                  <input
                    type="text"
                    value={item.title}
                    placeholder={displayTitle(item)}
                    onChange={(event) => {
                      persist(
                        updateSlotItem(
                          week,
                          slot.id,
                          index,
                          { title: event.target.value },
                          storeOpts,
                        ),
                      );
                    }}
                  />
                </label>
                <label className="field">
                  <span>Wording</span>
                  <input
                    type="text"
                    value={item.wording}
                    placeholder="Optional extra text"
                    onChange={(event) => {
                      persist(
                        updateSlotItem(
                          week,
                          slot.id,
                          index,
                          { wording: event.target.value },
                          storeOpts,
                        ),
                      );
                    }}
                  />
                </label>
                <label className="field">
                  <span>Qty</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={item.paired}
                    value={item.quantity === null ? "" : String(item.quantity)}
                    placeholder="Empty = omit in copy"
                    onChange={(event) => {
                      persist(
                        updateSlotItem(
                          week,
                          slot.id,
                          index,
                          { quantityInput: event.target.value },
                          storeOpts,
                        ),
                      );
                    }}
                  />
                </label>
                {!item.paired ? (
                  <button
                    type="button"
                    className="btn-text danger"
                    onClick={() => {
                      persist(removeSlotItem(week, slot.id, index, storeOpts));
                    }}
                  >
                    Remove dish
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn-block" onClick={openSuggestions}>
          Change or add dish
        </button>
      </div>

      <label className="field sheet-section">
        <span className="sheet-section-title">Instructions</span>
        <textarea
          rows={3}
          value={slot.instructions ?? ""}
          placeholder="Optional note for this meal"
          onChange={(event) => {
            persist(
              updateSlotInstructions(
                week,
                slot.id,
                event.target.value,
                storeOpts,
              ),
            );
          }}
        />
      </label>

      <div className="sheet-footer">
        <button type="button" className="btn danger-outline" onClick={handleClear}>
          Clear slot
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
