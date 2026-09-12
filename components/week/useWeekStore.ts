"use client";

import { getCurrentWeekStart } from "@/lib/time/week";
import {
  loadCurrentWeek,
  loadTemplate,
  subscribeWeekStorage,
} from "@/lib/store";
import type { Week } from "@/types/week";
import { useCallback, useEffect, useState } from "react";

export function useWeekStore() {
  const weekStart = getCurrentWeekStart(new Date());

  const [week, setWeek] = useState<Week | null>(null);
  const [templateRaw, setTemplateRaw] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setWeek(loadCurrentWeek(new Date()));
    setTemplateRaw(loadTemplate());
    setHydrated(true);
    return subscribeWeekStorage(weekStart, setWeek);
  }, [weekStart]);

  const replaceWeek = useCallback((next: Week) => {
    setWeek(next);
  }, []);

  const refreshTemplate = useCallback(() => {
    setTemplateRaw(loadTemplate());
  }, []);

  return {
    weekStart,
    week,
    hydrated,
    templateRaw,
    setWeek: replaceWeek,
    setTemplateRaw,
    refreshTemplate,
  };
}
