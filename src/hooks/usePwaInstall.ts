import { useState, useEffect, useRef } from "react";

export type PlatformType =
  | "Chrome Android"
  | "Chrome Desktop"
  | "Edge"
  | "Samsung Internet"
  | "Safari iOS"
  | "Safari macOS"
  | "Firefox"
  | "Unknown";

export function detectPlatform(): PlatformType {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "Unknown";
  }

  const ua = navigator.userAgent;
  const vendor = navigator.vendor || "";
  
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isMac = /Macintosh|MacIntel/i.test(ua) && !isIOS;

  // Samsung Internet
  if (/SamsungBrowser/i.test(ua)) {
    return "Samsung Internet";
  }

  // Edge
  if (/Edg/i.test(ua)) {
    return "Edge";
  }

  // Firefox
  if (/Firefox|FxiOS/i.test(ua)) {
    return "Firefox";
  }

  // Safari iOS / macOS
  const isAppleVendor = /Apple/i.test(vendor);
  if (isAppleVendor) {
    if (isIOS) return "Safari iOS";
    if (isMac) return "Safari macOS";
  }

  // Fallback Safari iOS
  if (isIOS && /Safari/i.test(ua) && !/CriOS/i.test(ua) && !/FxiOS/i.test(ua)) {
    return "Safari iOS";
  }

  // Chrome
  if (/Chrome|CriOS/i.test(ua)) {
    if (isAndroid) return "Chrome Android";
    return "Chrome Desktop";
  }

  return "Unknown";
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Capture this at module load. ProfileView is not mounted on the login screen,
// so registering only from the hook would miss the one-shot browser event.
let capturedPromptEvent: BeforeInstallPromptEvent | null = null;
const promptSubscribers = new Set<(event: BeforeInstallPromptEvent) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    const promptEvent = event as BeforeInstallPromptEvent;
    promptEvent.preventDefault();
    capturedPromptEvent = promptEvent;
    promptSubscribers.forEach((subscriber) => subscriber(promptEvent));
  });
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true ||
    document.referrer.startsWith("android-app://");
}

export function usePwaInstall() {
  const [isInstalled, setIsInstalled] = useState<boolean>(isStandaloneDisplayMode);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(() => capturedPromptEvent !== null);
  const [platform, setPlatform] = useState<PlatformType>("Unknown");

  const isInstallSupported = platform !== "Unknown" && !isInstalled;

  useEffect(() => {
    setPlatform(detectPlatform());

    // Sync media query changes (e.g. running display mode standalone/fullscreen)
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      (mediaQuery as any).addListener(handleChange);
    }

    const handlePrompt = (e: BeforeInstallPromptEvent) => {
      deferredPrompt.current = e;
      setCanInstall(true);
    };
    deferredPrompt.current = capturedPromptEvent;
    setCanInstall(capturedPromptEvent !== null);
    promptSubscribers.add(handlePrompt);

    // Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      deferredPrompt.current = null;
      capturedPromptEvent = null;
      setCanInstall(false);
      console.log("PWA appinstalled event detected.");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        (mediaQuery as any).removeListener(handleChange);
      }
      promptSubscribers.delete(handlePrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const currentPrompt = deferredPrompt.current;
    if (!currentPrompt) {
      console.info("PWA install prompt is not available in this browser context.");
      return false;
    }

    try {
      await currentPrompt.prompt();
      const choiceResult = await currentPrompt.userChoice;
      console.log(`User install choice: ${choiceResult.outcome}`);
      
      // Clear local states
      deferredPrompt.current = null;
      capturedPromptEvent = null;
      setCanInstall(false);
      
      return choiceResult.outcome === "accepted";
    } catch (err) {
      console.error("Failed to run PWA prompt install:", err);
      return false;
    }
  };

  return {
    isInstalled,
    canInstall,
    isInstallSupported,
    platform,
    install,
  };
}
