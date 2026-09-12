export type {
  MessageCopyScope,
  MessageTemplateConfig,
} from "./types";

export {
  DEFAULT_MESSAGE_TEMPLATE,
  DEFAULT_MESSAGE_TEMPLATE_STORAGE,
  serializeMessageTemplate,
} from "./defaultTemplate";

export {
  loadResolvedMessageTemplate,
  resolveMessageTemplate,
} from "./resolveTemplate";

export { displayTitle, formatSlotItem } from "./formatItem";
export {
  formatItemsLine,
  isWednesdayLunchRotiOnly,
  renderSlotLines,
} from "./formatSlot";

export { slotsForScope } from "./scope";
export { previewMessage, renderMessage } from "./render";

export { copyTextToClipboard, type ClipboardCopyResult } from "./clipboard";
export { copyMessage, type CopyMessageResult } from "./copy";
export { approveAndCopyFullWeek, type ApproveAndCopyResult } from "./approveCopy";
