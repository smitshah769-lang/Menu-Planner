export { TEMPLATE_STORAGE_KEY, weekStorageKey } from "./keys";

export {
  allSlotsDecided,
  requiresGenerateConfirm,
  statusAfterEdit,
  undecidedSlotIds,
} from "./status";

export {
  buildUndecidedSnapshot,
  noopReminderBridge,
  type ReminderBridge,
  type UndecidedSnapshot,
} from "./snapshot";

export {
  getBrowserStorage,
  loadCurrentWeek,
  loadTemplate,
  loadWeek,
  saveTemplate,
  saveWeek,
  subscribeWeekStorage,
  weekFromStorageEvent,
  type PersistOptions,
} from "./persist";

export {
  applySlotSuggestion,
  approveWeek,
  clearWeekSlot,
  generateMenu,
  removeSlotItem,
  updateSlotInstructions,
  updateSlotItem,
  type ApproveWeekResult,
  type GenerateMenuResult,
  type SlotItemPatch,
} from "./mutations";
