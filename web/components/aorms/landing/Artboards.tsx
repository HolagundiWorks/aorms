"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from "react";

export type Board = {
  id: string;
  num: string;
  title: string;
  /** Short label for the phone number rail. */
  short?: string;
  /** Extra `#hash` anchors that should open this board (e.g. old section ids). */
  aliases?: string[];
  children: ReactNode;
};

export type Nameplate = {
  cta: { label: string; href: string };
  studio: string;
  lines: { text: string; href?: string }[];
  links: { label: string; href: string }[];
};

/**
 * The landing page's "artboards", re-done against the CURRENT hcworks.in: one full-viewport
 * sheet at a time. Desktop: the sheet fills the page and a fixed right-hand NAMEPLATE carries
 * the CTA, the big board number, its title, prev/next arrows, a small index, and the studio's
 * contact block. Phones: a black title bar (number | title) and a right-hand number rail.
 * Same behaviours as hcworks.in — arrow keys / Home / End move between boards and `#hash` links
 * open one — but no scroll-wheel hijacking. Every board is rendered on the server (closed
 * boards are `display:none` + `inert`), so the whole page stays crawlable.
 */
export function Artboards({ boards, nameplate }: { boards: Board[]; nameplate: Nameplate }) {
  const [active, setActive] = useState(0);

  const indexForHash = useCallback(
    (hash: string) => {
      const id = hash.replace(/^#\/?/, "");
      if (!id) return -1;
      return boards.findIndex((b) => b.id === id || b.aliases?.includes(id));
    },
    [boards],
  );

  useEffect(() => {
    const open = () => {
      const i = indexForHash(window.location.hash);
      if (i >= 0) setActive(i);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [indexForHash]);

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(boards.length - 1, i));
      setActive(next);
      try {
        history.replaceState(null, "", `#${boards[next]!.id}`);
      } catch {
        /* hash only */
      }
      window.scrollTo?.({ top: 0 });
    },
    [boards],
  );

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") go(active + 1);
      else if (e.key === "ArrowLeft") go(active - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(boards.length - 1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, boards.length, go]);

  const cur = boards[active]!;

  function railKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else return;
    e.preventDefault();
  }

  return (
    <div className="aorms-lp" id="main">
      {/* Phones/tablets: black title bar + right-hand number rail */}
      <div className="aorms-lp-bar" aria-hidden>
        <span className="aorms-lp-bar__left">
          <span>{cur.num}</span>
          <span className="aorms-lp-sep">|</span>
          <span>{cur.title}</span>
        </span>
        <span className="aorms-lp-bar__mark">AORMS</span>
      </div>
      <nav className="aorms-lp-rail" aria-label="Sections">
        {boards.map((b, i) => (
          <button key={b.id} type="button" aria-current={i === active} aria-label={`${b.num} ${b.title}`} onClick={() => go(i)} onKeyDown={(e) => railKey(e, i)}>
            <span>{b.num}</span>
            <small>{b.short ?? b.title}</small>
          </button>
        ))}
      </nav>

      <div className="aorms-lp-stage">
        {boards.map((b, i) => {
          const open = i === active;
          return (
            <section
              key={b.id}
              id={b.id}
              className={`aorms-lp-board${open ? " is-active" : ""}`}
              aria-label={`${b.num} ${b.title}`}
              aria-hidden={!open}
              {...(open ? {} : { inert: true })}
            >
              <div className="aorms-lp-panel">{b.children}</div>
            </section>
          );
        })}
      </div>

      {/* Desktop nameplate */}
      <aside className="aorms-lp-nameplate" aria-label="Page navigation">
        <Link href={nameplate.cta.href} className="aorms-lp-np__cta">
          {nameplate.cta.label}
        </Link>
        <div className="aorms-lp-np__num" aria-hidden>
          {cur.num}
        </div>
        <p className="aorms-lp-np__title">{cur.title}</p>
        <div className="aorms-lp-np__arrows">
          <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous section">
            ←
          </button>
          <button type="button" onClick={() => go(active + 1)} disabled={active === boards.length - 1} aria-label="Next section">
            →
          </button>
        </div>
        <ul className="aorms-lp-np__index">
          {boards.map((b, i) => (
            <li key={b.id}>
              <button type="button" aria-current={i === active} onClick={() => go(i)}>
                <span>{b.num}</span>
                <span>{b.title}</span>
              </button>
            </li>
          ))}
        </ul>
        <footer className="aorms-lp-np__studio">
          <strong>{nameplate.studio}</strong>
          {nameplate.lines.map((l) => (
            <div key={l.text}>{l.href ? <a href={l.href}>{l.text}</a> : l.text}</div>
          ))}
          <nav aria-label="Footer">
            {nameplate.links.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        </footer>
      </aside>
    </div>
  );
}
