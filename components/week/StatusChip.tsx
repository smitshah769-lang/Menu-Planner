import type { WeekStatus } from "@/types/week";

const LABELS: Record<WeekStatus, string> = {
  NOT_CREATED: "Not started",
  GENERATED: "Generated",
  UNDER_REVIEW: "In review",
  APPROVED: "Approved",
};

export function StatusChip({ status }: { status: WeekStatus }) {
  return (
    <span
      className={`status-chip status-${status.toLowerCase().replaceAll("_", "-")}`}
    >
      {LABELS[status]}
    </span>
  );
}
