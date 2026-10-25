"use client";

import * as amplitude from "@amplitude/analytics-browser";

import { getConsent, subscribe } from "@/lib/consent/store";

import type { AnalyticsProvider, UserTraits } from "../types";

/**
 * Amplitude, EU data residency. KVKK Çerez Rehberi gereği SDK yalnızca
 * kullanıcı analitik çerez onayı verdikten sonra başlatılır; onay yoksa
 * `init()` çağrılmaz ve her `track`/`identify` çağrısı sessizce no-op olur.
 * Onay sonradan verilirse `subscribe` üzerinden lazy init yapılır.
 */

const API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

let ready = false;

function ensureInit() {
  if (ready) return;
  if (!API_KEY || typeof window === "undefined") return;
  if (!getConsent().analytics) return;
  amplitude.init(API_KEY, {
    serverZone: "EU",
    autocapture: { pageViews: false },
  });
  ready = true;
}

export const amplitudeProvider: AnalyticsProvider = {
  name: "amplitude",

  init() {
    ensureInit();
    // Onay sonradan verilirse SDK'yı o anda ayağa kaldır.
    if (typeof window !== "undefined") {
      subscribe((state) => {
        if (state.analytics) ensureInit();
        else if (ready) {
          // Onay geri alınırsa Amplitude'u resetle — ileride gelecek olaylar
          // yeni anonim id ile başlar; eski eşleştirme kullanılamaz.
          try {
            amplitude.reset();
          } catch {
            // ignore
          }
        }
      });
    }
  },

  track(event, params) {
    if (!ready) return;
    amplitude.track(event, params as Record<string, unknown>);
  },

  identify(userId, traits) {
    if (!ready) return;
    amplitude.setUserId(userId);
    if (traits) applyTraits(traits);
  },

  setUserProperties(traits) {
    if (!ready) return;
    applyTraits(traits);
  },

  reset() {
    if (!ready) return;
    amplitude.reset();
  },
};

function applyTraits(traits: UserTraits) {
  const identify = new amplitude.Identify();
  for (const [key, value] of Object.entries(traits)) {
    if (value === undefined || value === null) continue;
    identify.set(key, value);
  }
  amplitude.identify(identify);
}
