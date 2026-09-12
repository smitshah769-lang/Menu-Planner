export type ClipboardCopyResult = {
  ok: boolean;
  text: string;
};

/** navigator.clipboard with on-screen fallback payload (A4, A12). */
export async function copyTextToClipboard(text: string): Promise<ClipboardCopyResult> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, text };
    } catch {
      return { ok: false, text };
    }
  }
  return { ok: false, text };
}
