"use client";

import { useEffect, useRef } from "react";

type Props = {
  text: string;
  onClose: () => void;
};

export function ClipboardFallback({ text, onClose }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2 className="modal-title">Copy manually</h2>
        <p className="modal-body">
          Clipboard access failed. Select the text below and copy it yourself.
        </p>
        <textarea
          ref={textareaRef}
          className="clipboard-fallback"
          readOnly
          value={text}
          rows={12}
        />
        <div className="modal-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              textareaRef.current?.select();
            }}
          >
            Select all
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
