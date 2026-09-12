export const TEMPLATE_STORAGE_KEY = "menu-planner:template";

export function weekStorageKey(weekStart: string): string {
  return `menu-planner:week:${weekStart}`;
}
