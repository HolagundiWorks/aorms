"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type Board = {
  id: string;
  num: string;
  title: string;
  /** Extra `#hash` anchors that should open this board (e.g. old section ids). */
  aliases?: string[];
  children: ReactNode;
};

/**
 * The landing page's "artboards" — the layout hcworks.in uses: numbered boards side by
 * side, exactly one open at a time. Desktop: each board is a vertical strip (number ·
 * title · arrow) and the open one widens into a two-column sheet (copy left, "the result"
 * right). Below 66rem it becomes a vertical accordion. Every board's content is rendered
 * on the server (closed boards are only hidden with CSS), so it stays crawlable and works
 * without JS for reading; `#hash` links (the CTAs and nav use them) open the right board.
 */
export function Artboards({ boards }: { boards: Board[] }) {
  const [active, setActive] = useState(0);
  const headRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  function select(i: number) {
    setActive(i);
    try {
      history.replaceState(null, "", `#${boards[i]!.id}`);
    } catch {
      /* hash only */
    }
  }

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? boards.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const target = (next + boards.length) % boards.length;
    headRefs.current[target]?.focus();
    select(target);
  }

  return (
    <main className="aorms-lp" id="main">
      {boards.map((b, i) => {
        const open = i === active;
        return (
          <section key={b.id} id={b.id} className={`aorms-lp-board${open ? " is-active" : ""}`} aria-label={b.title}>
            <button
              ref={(el) => {
                headRefs.current[i] = el;
              }}
              type="button"
              className="aorms-lp-head"
              id={`${b.id}-tab`}
              aria-expanded={open}
              aria-controls={`${b.id}-panel`}
              onClick={() => select(i)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span className="aorms-lp-num">{b.num}</span>
              <span className="aorms-lp-title">{b.title}</span>
              <span className="aorms-lp-arrow" aria-hidden>
                →
              </span>
            </button>
            <div className="aorms-lp-body" id={`${b.id}-panel`} role="region" aria-labelledby={`${b.id}-tab`} aria-hidden={!open} {...(open ? {} : { inert: true })}>
              {b.children}
            </div>
          </section>
        );
      })}
    </main>
  );
}
