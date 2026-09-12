export type MenuGenerateErrorCode =
  | "NO_ELIGIBLE_JUNK"
  | "NO_ELIGIBLE_SUBJI"
  | "NO_ELIGIBLE_DAL"
  | "NO_ELIGIBLE_ROTI";

/** Visible generate failure (G18) — never silently fill junk night with a default plate. */
export class MenuGenerateError extends Error {
  readonly code: MenuGenerateErrorCode;

  constructor(code: MenuGenerateErrorCode, message: string) {
    super(message);
    this.name = "MenuGenerateError";
    this.code = code;
  }
}
