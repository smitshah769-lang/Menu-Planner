import type { MessageTemplateConfig } from "./types";

export const DEFAULT_MESSAGE_TEMPLATE: MessageTemplateConfig = {
  version: 1,
  header: "Hi, this week's tiffin menu (4 people):",
  mealLine: "{mealType}: {items}",
  noteLine: "Note: {instructions}",
  itemSeparator: " + ",
  itemFormat: "{title}{qtyPart}{wordingPart}",
};

export function serializeMessageTemplate(config: MessageTemplateConfig): string {
  return JSON.stringify(config);
}

export const DEFAULT_MESSAGE_TEMPLATE_STORAGE = serializeMessageTemplate(
  DEFAULT_MESSAGE_TEMPLATE,
);
