"use client";

import { useState } from "react";
import { DEMO } from "../../../lib/marketing-content";
import demoAccounts from "../../../lib/demo-accounts.json";

type Account = (typeof demoAccounts)[number];

const PORTAL_ROLES = new Set(["CLIENT", "CONSULTANT", "CONTRACTOR"]);

/** Fill the sign-in form's two fields (Carbon inputs are uncontrolled here, so write the DOM value and tell React). */
function fillSignIn(email: string, password: string) {
  for (const [id, value] of [["email", email], ["password", password]] as const) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) continue;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/**
 * Demo credentials for the sign-in page (2026-10-07 rework). One sample studio, ten sign-ins, grouped the way
 * the product is: the office by level, then the three outside portals. Picking a row fills the form and shows,
 * once, what that sign-in can do (instead of ten paragraphs). No credential is ever printed: the email and the
 * (masked) password only appear in the sign-in form's own fields.
 */
export function DemoAccounts() {
  const [selected, setSelected] = useState<Account | null>(null);

  const office = demoAccounts.filter((a) => !PORTAL_ROLES.has(a.role));
  const portals = demoAccounts.filter((a) => PORTAL_ROLES.has(a.role));

  function pick(a: Account) {
    setSelected(a);
    fillSignIn(a.email, DEMO.password);
  }

  const group = (label: string, hint: string, rows: Account[]) => (
    <div className="aorms-demo__group" role="radiogroup" aria-label={label}>
      <p className="aorms-demo__label">
        {label} <span>{hint}</span>
      </p>
      <ul>
        {rows.map((a) => (
          <li key={a.email}>
            <button type="button" role="radio" aria-checked={selected?.email === a.email} className="aorms-demo__row" onClick={() => pick(a)}>
              <span className="aorms-demo__who">
                <strong>{a.title}</strong>
                <span>{a.name}</span>
              </span>
              {!PORTAL_ROLES.has(a.role) && <span className="aorms-demo__level">L{a.level}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section className="aorms-demo" aria-label="Demo accounts">
      <p className="aorms-demo__head">Try the live demo</p>
      <p className="aorms-demo__lede">One sample studio, every level. Pick one and the form fills itself.</p>

      {group("Office", "L1 sees most · L5 least", office)}
      {group("Portals", "outside the office", portals)}

      <div className="aorms-demo__detail" aria-live="polite">
        {selected ? (
          <>
            <p>
              <strong>{selected.title}</strong> · {selected.name}
            </p>
            <p>{selected.can}</p>
          </>
        ) : (
          <p>Select a sign-in to see what it can do.</p>
        )}
      </div>

      <p className="aorms-demo__foot">Sample data, reset nightly.</p>
    </section>
  );
}
