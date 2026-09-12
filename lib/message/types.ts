export type MessageCopyScope =
  | { type: "fullWeek" }
  | { type: "slots"; slotIds: string[] };

export type MessageTemplateConfig = {
  version: 1;
  header: string;
  mealLine: string;
  noteLine: string;
  itemSeparator: string;
  itemFormat: string;
};
