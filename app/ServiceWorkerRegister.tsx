"use client";

import { useEffect } from "react";

/** Registers the service worker (web push receive + notification click). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}
