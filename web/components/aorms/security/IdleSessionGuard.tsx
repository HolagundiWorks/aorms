"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@carbon/react";

// 2026-09-14 — enterprise-grade session security pass, explicit user
// request ("auto logout"). No idle-timeout mechanism existed anywhere in
// this app before this (confirmed via a full-repo audit) — every sign-out
// was purely user-initiated, so a signed-in tab left open indefinitely
// (a shared workstation, a browser left unlocked) stayed signed in
// forever, bounded only by Supabase's own ~400-day cookie lifetime.
//
// Mounted once per authenticated shell (see the two Server Component
// layouts / PlatformShellHeader.tsx that render this) — never rendered
// for a signed-out visitor, since each mount point already gates on an
// active session before rendering children.
//
// Cross-tab sync via `localStorage`: any tracked activity in ANY open tab
// of the same origin writes a shared "last activity" timestamp, and every
// tab's timer reads that shared value rather than only its own local
// activity — so working in tab A doesn't let tab B silently expire and
// pop a warning modal the user never sees coming.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 60 * 1000; // show the warning 60s before sign-out
const ACTIVITY_STORAGE_KEY = "aorms-last-activity";
const ACTIVITY_EVENTS = ["mousemove", "keydown", "scroll", "touchstart", "click"] as const;

function readSharedLastActivity(): number {
  try {
    const raw = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
    return raw ? Number(raw) : Date.now();
  } catch {
    // localStorage can throw in a private-browsing/blocked-storage
    // context — fall back to "just now" rather than crash the guard.
    return Date.now();
  }
}

function writeSharedLastActivity(at: number) {
  try {
    window.localStorage.setItem(ACTIVITY_STORAGE_KEY, String(at));
  } catch {
    // Best-effort — a failed write just means cross-tab sync degrades to
    // per-tab timing for this one tab, never worth surfacing to the user.
  }
}

export function IdleSessionGuard({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(WARNING_BEFORE_MS / 1000));
  const checkIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const signingOutRef = useRef(false);

  const doSignOut = useCallback(() => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    signOutAction().catch(() => {
      // signOutAction() redirects via next/navigation's redirect(), which
      // throws internally by design (NEXT_REDIRECT) — this catch only
      // guards against a genuine failure, not the expected control flow.
    });
  }, [signOutAction]);

  const resetActivity = useCallback(() => {
    const now = Date.now();
    writeSharedLastActivity(now);
    if (warningOpen) {
      setWarningOpen(false);
      setSecondsLeft(Math.round(WARNING_BEFORE_MS / 1000));
    }
  }, [warningOpen]);

  // Track activity in THIS tab.
  useEffect(() => {
    const handler = () => resetActivity();
    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, handler, { passive: true });
    return () => {
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, handler);
    };
  }, [resetActivity]);

  // Pick up activity from OTHER tabs (storage events only fire cross-tab,
  // never in the tab that made the write).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_STORAGE_KEY && warningOpen) {
        setWarningOpen(false);
        setSecondsLeft(Math.round(WARNING_BEFORE_MS / 1000));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [warningOpen]);

  // The idle check itself — polls the shared last-activity timestamp
  // rather than a local timer, so it reflects the truth across tabs.
  useEffect(() => {
    writeSharedLastActivity(Date.now());

    checkIntervalRef.current = window.setInterval(() => {
      const idleFor = Date.now() - readSharedLastActivity();
      if (idleFor >= IDLE_TIMEOUT_MS) {
        doSignOut();
      } else if (idleFor >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS) {
        setWarningOpen(true);
      }
    }, 1000);

    return () => {
      if (checkIntervalRef.current) window.clearInterval(checkIntervalRef.current);
    };
  }, [doSignOut]);

  // Live countdown display while the warning modal is open.
  useEffect(() => {
    if (!warningOpen) {
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
      return;
    }
    countdownIntervalRef.current = window.setInterval(() => {
      const idleFor = Date.now() - readSharedLastActivity();
      const remainingMs = Math.max(0, IDLE_TIMEOUT_MS - idleFor);
      setSecondsLeft(Math.ceil(remainingMs / 1000));
    }, 1000);
    return () => {
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    };
  }, [warningOpen]);

  if (!warningOpen) return null;

  return (
    <Modal
      open
      modalHeading="You've been idle"
      modalLabel="Session timeout"
      primaryButtonText="Stay signed in"
      secondaryButtonText="Sign out now"
      onRequestClose={resetActivity}
      onRequestSubmit={resetActivity}
      onSecondarySubmit={doSignOut}
      preventCloseOnClickOutside
    >
      <p className="cds--type-body-01">
        For your security, you&apos;ll be signed out in <strong>{secondsLeft}s</strong> due to inactivity.
      </p>
    </Modal>
  );
}
