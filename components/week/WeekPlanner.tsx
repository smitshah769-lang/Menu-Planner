"use client";

import { approveAndCopyFullWeek, copyMessage } from "@/lib/message";
import { MenuGenerateError } from "@/lib/rules";
import { CLIENT_PERSIST_OPTIONS, syncPushSnapshot } from "@/lib/push";
import { allSlotsDecided, buildUndecidedSnapshot, generateMenu } from "@/lib/store";
import { decidedCount, formatWeekRange, weekdayLabel } from "@/lib/time/week";
import { slotShortLabel } from "@/lib/ui/slotLabel";
import { summarizeSlot } from "@/lib/ui/slotSummary";
import type { MessageCopyScope } from "@/lib/message";
import type { Slot, Week, Weekday } from "@/types/week";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PushBanner } from "../push/PushBanner";
import { ClipboardFallback } from "../ui/ClipboardFallback";
import { SlotSheet } from "./SlotSheet";
import { StatusChip } from "./StatusChip";
import { useWeekStore } from "./useWeekStore";

function slotById(week: { slots: Slot[] }, slotId: string): Slot | undefined {
  return week.slots.find((candidate) => candidate.id === slotId);
}

/** Full week when complete; otherwise only decided slots (A2 — never fake a full week). */
function copyScope(week: Week, midweekSlotIds: string[]): MessageCopyScope {
  if (midweekSlotIds.length > 0) {
    return { type: "slots", slotIds: midweekSlotIds };
  }
  if (allSlotsDecided(week)) {
    return { type: "fullWeek" };
  }
  const decidedIds = week.slots
    .filter((slot) => slot.slotStatus === "DECIDED")
    .map((slot) => slot.id);
  return { type: "slots", slotIds: decidedIds };
}

export function WeekPlanner() {
  const { weekStart, week, hydrated, templateRaw, setWeek } = useWeekStore();
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [midweekCopyIds, setMidweekCopyIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [clipboardFallback, setClipboardFallback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSlot = week && activeSlotId ? slotById(week, activeSlotId) : undefined;

  const decided = week ? decidedCount(week) : 0;

  const days = useMemo(() => {
    if (!week) {
      return [];
    }
    return ([1, 2, 3, 4, 5, 6, 7] as Weekday[]).map((weekday) => ({
      weekday,
      label: weekdayLabel(weekday),
      lunch: week.slots.find(
        (slot) => slot.weekday === weekday && slot.mealType === "lunch",
      ),
      dinner: week.slots.find(
        (slot) => slot.weekday === weekday && slot.mealType === "dinner",
      ),
    }));
  }, [week]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    if (!hydrated || !week) {
      return;
    }
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      void syncPushSnapshot(buildUndecidedSnapshot(week));
    }
  }, [hydrated, week]);

  const onSlotDecidedFromUndecided = useCallback((slotId: string) => {
    setMidweekCopyIds((ids) =>
      ids.includes(slotId) ? ids : [...ids, slotId],
    );
  }, []);

  function handleGenerate(confirm = false) {
    if (!week) {
      return;
    }
    setError(null);
    try {
      const result = generateMenu(week, { ...CLIENT_PERSIST_OPTIONS, confirm });
      if (!result.ok && result.reason === "needs-confirm") {
        const ok = window.confirm(
          "Replace this week's menu? Current edits will be lost.",
        );
        if (ok) {
          handleGenerate(true);
        }
        return;
      }
      if (result.ok) {
        setWeek(result.week);
        setMidweekCopyIds([]);
        showToast("Menu generated for the week");
      }
    } catch (err) {
      if (err instanceof MenuGenerateError) {
        setError(err.message);
      } else {
        setError("Could not generate menu. Try again.");
      }
    }
  }

  async function handleApprove() {
    if (!week) {
      return;
    }
    setError(null);
    const result = await approveAndCopyFullWeek(
      week,
      templateRaw,
      CLIENT_PERSIST_OPTIONS,
    );
    if (!result.ok) {
      const labels = result.undecidedSlotIds
        .map((id) => {
          const slot = slotById(week, id);
          return slot ? slotShortLabel(slot) : id;
        })
        .join(", ");
      setError(`Cannot approve yet. Undecided: ${labels}`);
      return;
    }
    setWeek(result.week);
    setMidweekCopyIds([]);
    if (result.clipboardOk) {
      showToast("Approved and copied to clipboard");
    } else {
      setClipboardFallback(result.text);
      showToast("Approved — copy the text manually");
    }
  }

  async function handleCopy() {
    if (!week) {
      return;
    }
    setError(null);
    const scope = copyScope(week, midweekCopyIds);

    const result = await copyMessage(week, scope, templateRaw);
    if (!result.ok) {
      const labels = result.undecidedSlotIds
        .map((id) => {
          const slot = slotById(week, id);
          return slot ? slotShortLabel(slot) : id;
        })
        .join(", ");
      setError(`Cannot copy full week. Undecided: ${labels}`);
      return;
    }

    if (result.clipboard.ok) {
      const filledJustNow = midweekCopyIds.length > 0;
      showToast(
        scope.type === "fullWeek"
          ? "Copied week to clipboard"
          : filledJustNow
            ? "Copied selected slot(s) to clipboard"
            : `Copied ${decided} decided meal(s) — undecided slots omitted`,
      );
      if (filledJustNow) {
        setMidweekCopyIds([]);
      }
    } else {
      setClipboardFallback(result.text);
    }
  }

  const copyLabel =
    midweekCopyIds.length > 0
      ? `Copy ${midweekCopyIds.length} slot(s)`
      : week && allSlotsDecided(week)
        ? "Copy week"
        : `Copy decided (${decided})`;

  const canCopy = week && week.status !== "NOT_CREATED" && decided > 0;
  const canApprove = week && week.status !== "NOT_CREATED";

  if (!hydrated || !week) {
    return (
      <main className="app-shell">
        <p className="page-loading">Loading week…</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <PushBanner week={week} />
      <header className="sticky-chrome">
        <p className="eyebrow">Tiffin menu</p>
        <div className="title-row">
          <h1 className="app-title">Weekly planner</h1>
          <StatusChip status={week.status} />
        </div>
        <div className="week-meta">
          <p className="week-range">{formatWeekRange(weekStart)}</p>
          <p className="decided-count">{decided}/14 decided</p>
        </div>
        {error ? <p className="banner-error" role="alert">{error}</p> : null}
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => handleGenerate()}>
            Generate Menu
          </button>
          <button
            type="button"
            className="btn"
            disabled={!canApprove}
            onClick={handleApprove}
          >
            Approve
          </button>
          <button
            type="button"
            className="btn"
            disabled={!canCopy}
            onClick={handleCopy}
          >
            {copyLabel}
          </button>
        </div>
      </header>

      <ol className="week-list">
        {days.map((day) => (
          <li key={day.weekday} className="day-card">
            <h2 className="day-name">
              {day.label}
              {day.lunch ? (
                <span className="day-date">{day.lunch.date}</span>
              ) : null}
            </h2>
            {[day.lunch, day.dinner]
              .filter((slot): slot is Slot => Boolean(slot))
              .map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  className={`slot-row slot-button slot-${slot.slotStatus.toLowerCase()}`}
                  onClick={() => setActiveSlotId(slot.id)}
                >
                  <p className="slot-label">
                    {slot.mealType === "lunch" ? "Lunch" : "Dinner"}
                  </p>
                  <p className="slot-body">{summarizeSlot(slot)}</p>
                </button>
              ))}
          </li>
        ))}
      </ol>

      <Link className="template-link" href="/template">
        Message template
      </Link>

      {toast ? <div className="toast" role="status">{toast}</div> : null}

      {activeSlot ? (
        <>
          <button
            type="button"
            className="sheet-scrim"
            aria-label="Close slot editor"
            onClick={() => setActiveSlotId(null)}
          />
          <div className="sheet-container">
            <SlotSheet
              week={week}
              slot={activeSlot}
              onWeekChange={setWeek}
              onClose={() => setActiveSlotId(null)}
              onSlotDecidedFromUndecided={onSlotDecidedFromUndecided}
            />
          </div>
        </>
      ) : null}

      {clipboardFallback ? (
        <ClipboardFallback
          text={clipboardFallback}
          onClose={() => setClipboardFallback(null)}
        />
      ) : null}
    </main>
  );
}
