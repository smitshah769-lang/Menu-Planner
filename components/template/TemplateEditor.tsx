"use client";

import {
  DEFAULT_MESSAGE_TEMPLATE,
  previewMessage,
  serializeMessageTemplate,
} from "@/lib/message";
import { loadResolvedMessageTemplate } from "@/lib/message/resolveTemplate";
import { loadTemplate, saveTemplate } from "@/lib/store";
import type { MessageTemplateConfig } from "@/lib/message/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWeekStore } from "../week/useWeekStore";

type FieldKey = keyof Omit<MessageTemplateConfig, "version">;

const FIELDS: { key: FieldKey; label: string; hint: string; rows?: number }[] = [
  {
    key: "header",
    label: "Header",
    hint: "First line of the message",
    rows: 2,
  },
  {
    key: "mealLine",
    label: "Meal line",
    hint: "Placeholders: {mealType}, {items}",
  },
  {
    key: "noteLine",
    label: "Note line",
    hint: "Placeholders: {instructions} — omitted when empty",
  },
  {
    key: "itemSeparator",
    label: "Item separator",
    hint: "Between dishes on one line",
  },
  {
    key: "itemFormat",
    label: "Item format",
    hint: "{title}, {qtyPart}, {wordingPart}",
  },
];

export function TemplateEditor() {
  const { week, hydrated, templateRaw, setTemplateRaw } = useWeekStore();
  const [config, setConfig] = useState<MessageTemplateConfig>(DEFAULT_MESSAGE_TEMPLATE);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const stored = loadTemplate();
    setConfig(loadResolvedMessageTemplate(stored));
    setTemplateRaw(stored);
  }, [setTemplateRaw]);

  const serialized = useMemo(() => serializeMessageTemplate(config), [config]);

  const preview = useMemo(() => {
    if (!week || week.status === "NOT_CREATED") {
      return "Generate a menu on the home screen to preview copy with real slots.";
    }
    return previewMessage(week, serialized);
  }, [week, serialized]);

  const updateField = useCallback((key: FieldKey, value: string) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }, []);

  function handleSave() {
    saveTemplate(serialized);
    setTemplateRaw(serialized);
    setSaved(true);
  }

  function handleReset() {
    setConfig({ ...DEFAULT_MESSAGE_TEMPLATE });
    setSaved(false);
  }

  if (!hydrated) {
    return (
      <main className="app-shell">
        <p className="page-loading">Loading…</p>
      </main>
    );
  }

  return (
    <main className="app-shell template-page">
      <header className="page-header">
        <p className="eyebrow">WhatsApp copy</p>
        <h1 className="app-title">Message template</h1>
        <p className="muted">
          Plain text only. Edited dish titles appear in copy, not catalog ids.
        </p>
      </header>

      <section className="template-fields">
        {FIELDS.map((field) => (
          <label key={field.key} className="field">
            <span>{field.label}</span>
            <span className="field-hint">{field.hint}</span>
            {field.rows && field.rows > 1 ? (
              <textarea
                rows={field.rows}
                value={config[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
              />
            ) : (
              <input
                type="text"
                value={config[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
              />
            )}
          </label>
        ))}
        <div className="template-actions">
          <button type="button" className="btn" onClick={handleReset}>
            Reset to default
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            {saved ? "Saved" : "Save template"}
          </button>
        </div>
      </section>

      <section className="template-preview">
        <h2 className="sheet-section-title">Live preview</h2>
        <pre className="preview-block">{preview}</pre>
      </section>

      <Link className="template-link" href="/">
        Back to this week
      </Link>
    </main>
  );
}
