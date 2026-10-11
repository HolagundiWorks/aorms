"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Scroll-to-zoom for the landing page's portal visuals (2026-10-11). Hover a visual and scroll DOWN to zoom
 * into it the way AutoCAD does — about the cursor, so whatever is under the pointer stays under it — and past a
 * point the real portal screen grows out of that visual's own rectangle to fill the view. Scroll UP (at the
 * overlay or on the zoomed visual), press Esc, or hit × to zoom back out. At 1× an upward scroll is left
 * alone so the page can still move to the previous board.
 *
 * The screens are real captures of the demo studio (`public/landing/screens`), not mock-ups. Touch and keyboard
 * get a button that opens the same screen directly; reduced-motion skips the zoom and opens it at once.
 */

/** Wheel direction that zooms IN: "down" matches the page (scroll down = go deeper); "up" is literal AutoCAD. */
const ZOOM_IN_DIRECTION: "down" | "up" = "down";
const MAX_SCALE = 2.4;
const OPEN_AT = 2.1;
const SPEED = 0.0016; // scale change per wheel pixel

export type PortalScreen = { src: string; alt: string; title: string; href: string; hrefLabel: string };

type Phase = "closed" | "from" | "to" | "closing";
type Box = { top: number; left: number; width: number; height: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function ZoomToScreen({ screen, children }: { screen: PortalScreen; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const t = useRef({ s: 1, x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [phase, setPhase] = useState<Phase>("closed");
  const [from, setFrom] = useState<Box>({ top: 0, left: 0, width: 0, height: 0 });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const apply = useCallback((s: number, x: number, y: number, animate: boolean) => {
    t.current = { s, x, y };
    const el = lens.current;
    if (el) {
      el.style.transition = animate ? "transform 360ms cubic-bezier(0.2, 0.7, 0.2, 1)" : "none";
      el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    }
    setScale(s);
  }, []);

  const rect = useCallback((): Box => {
    const r = root.current!.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }, []);

  const open = useCallback(() => {
    if (phase !== "closed" || !root.current) return;
    setFrom(rect());
    setPhase("from");
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("to")));
  }, [phase, rect]);

  const close = useCallback(() => {
    if (phase !== "to") return;
    setFrom(rect());
    setPhase("closing");
    apply(1, 0, 0, true);
    window.setTimeout(() => {
      setPhase("closed");
      opener.current?.focus({ preventScroll: true });
    }, reducedMotion() ? 0 : 480);
  }, [phase, rect, apply]);

  // Wheel on the visual: zoom about the cursor. Native + non-passive so the page (and the board's own
  // scroller) doesn't also move; stopPropagation keeps the board-to-board scroll handler out of it.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || Math.abs(e.deltaY) < 1 || phase !== "closed") return;
      const dir = ZOOM_IN_DIRECTION === "down" ? e.deltaY : -e.deltaY; // > 0 zooms in
      const cur = t.current;
      if (dir < 0 && cur.s <= 1.001) return; // nothing to zoom out of: let the page scroll
      e.preventDefault();
      e.stopPropagation();
      if (reducedMotion()) {
        if (dir > 0) open();
        return;
      }
      const r = el!.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const ns = clamp(cur.s * Math.exp(clamp(dir, -120, 120) * SPEED), 1, MAX_SCALE);
      const ratio = ns / cur.s;
      // keep the point under the cursor fixed, and keep the content covering the window
      const x = clamp(cx - (cx - cur.x) * ratio, r.width - r.width * ns, 0);
      const y = clamp(cy - (cy - cur.y) * ratio, r.height - r.height * ns, 0);
      apply(ns, ns === 1 ? 0 : x, ns === 1 ? 0 : y, false);
      if (ns >= OPEN_AT) open();
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [phase, apply, open]);

  // Leaving the visual lets the lens settle back; an open screen is unaffected.
  const onLeave = () => {
    if (phase === "closed" && t.current.s > 1) apply(1, 0, 0, true);
  };

  // Esc closes; scroll on the open screen: up closes, down is swallowed so the page doesn't jump behind it.
  useEffect(() => {
    if (phase !== "to") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const out = ZOOM_IN_DIRECTION === "down" ? e.deltaY < -4 : e.deltaY > 4;
      if (out) close();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [phase, close]);

  const shown = phase === "to";
  const frame: React.CSSProperties =
    phase === "to"
      ? { top: "4vh", left: "3vw", width: "94vw", height: "92vh" }
      : { top: from.top, left: from.left, width: from.width, height: from.height };

  return (
    <div className="aorms-zoom" ref={root} onMouseLeave={onLeave} data-zoomed={scale > 1.02 || undefined}>
      <div className="aorms-zoom__lens" ref={lens}>
        {children}
      </div>
      <span className="aorms-zoom__hint" aria-hidden>
        Scroll to zoom
      </span>
      <span className="aorms-zoom__bar" aria-hidden style={{ transform: `scaleX(${clamp((scale - 1) / (OPEN_AT - 1), 0, 1)})` }} />
      <button ref={opener} type="button" className="aorms-zoom__open" onClick={open} aria-label={`Open the ${screen.title} screen`}>
        View the screen
      </button>

      {mounted && phase !== "closed"
        ? createPortal(
            <div className={`aorms-zoom-veil${shown ? " is-open" : ""}`} onClick={close}>
              <div
                className="aorms-zoom-frame"
                style={frame}
                role="dialog"
                aria-modal="true"
                aria-label={`${screen.title} — portal screen`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="aorms-zoom-frame__bar">
                  <span>{screen.title}</span>
                  <span className="aorms-zoom-frame__actions">
                    <Link href={screen.href} onClick={() => setPhase("closed")}>
                      {screen.hrefLabel}
                    </Link>
                    <button type="button" onClick={close} aria-label="Close" autoFocus>
                      ×
                    </button>
                  </span>
                </div>
                <div className="aorms-zoom-frame__shot">
                  <Image src={screen.src} alt={screen.alt} width={1600} height={900} sizes="94vw" priority />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
