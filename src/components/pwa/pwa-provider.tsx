"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISSED_KEY = "scrollsense-install-dismissed-at";
const INSTALLED_KEY = "scrollsense-installed";
const DISMISS_DAYS = 7;
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;

function storageGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing or locked-down browsers can block localStorage.
  }
}

function storageRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Private browsing or locked-down browsers can block localStorage.
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function canShowAfterDismissal() {
  const dismissedAt = storageGet(DISMISSED_KEY);
  if (!dismissedAt) return true;
  const dismissedTime = Number(dismissedAt);
  return !Number.isFinite(dismissedTime) || Date.now() - dismissedTime >= DISMISS_MS;
}

export function PwaProvider() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const isiOS = typeof window !== "undefined" && /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // The app still works as a website if service worker registration is unavailable.
      });
    }

    if (isStandalone() || storageGet(INSTALLED_KEY) === "true" || !canShowAfterDismissal()) {
      return;
    }

    const promptTimer = window.setTimeout(() => setVisible(true), 120);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      storageSet(INSTALLED_KEY, "true");
      storageRemove(DISMISSED_KEY);
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(promptTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (isiOS && !installEvent) {
      return;
    }

    if (!installEvent) {
      return;
    }

    setIsInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;

      if (choice.outcome === "accepted") {
        storageSet(INSTALLED_KEY, "true");
        storageRemove(DISMISSED_KEY);
        setVisible(false);
      } else {
        storageSet(DISMISSED_KEY, String(Date.now()));
        setVisible(false);
      }

      setInstallEvent(null);
    } finally {
      setIsInstalling(false);
    }
  }

  function dismiss() {
    storageSet(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  }

  function markInstalledManually() {
    storageSet(INSTALLED_KEY, "true");
    storageRemove(DISMISSED_KEY);
    setVisible(false);
  }

  if (!visible || isStandalone()) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[25rem]">
      <div className="rounded-lg border border-sky-400/25 bg-slate-950/[0.94] p-4 text-white shadow-2xl shadow-sky-950/40 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-sky-400/[0.14] text-sky-300">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Install ScrollSense AI</h2>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  Add it to your phone or laptop for a faster standalone experience.
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close install prompt"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {isiOS && !installEvent ? (
              <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/75">
                On iPhone, tap Share, then Add to Home Screen. After installing, tap the confirmation button below.
              </p>
            ) : !installEvent ? (
              <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/75">
                Preparing the browser install option. Use Chrome or Edge if this button does not become active.
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={isiOS && !installEvent ? markInstalledManually : installApp}
                disabled={isInstalling || (!installEvent && !isiOS)}
                className="w-full"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {isInstalling ? "Installing..." : isiOS && !installEvent ? "I installed it" : installEvent ? "Install app" : "Install ready soon"}
              </Button>
              <Button variant="outline" onClick={dismiss} className="w-full border-white/15 text-white hover:bg-white/10">
                Maybe later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
