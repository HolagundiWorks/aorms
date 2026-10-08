/**
 * Linked-item derivation — port of HolagundiWorks/AQC's `DerivationEngine.cs` (`Preview`, `TopoOrder`) and the default
 * `LinkRuleBook` rules. A rule turns a source trade's measured quantity into a target trade's quantity
 * (`target = drive × factor`); rules run producers-before-consumers so chains resolve (masonry → plaster → paint),
 * and a chained source is flagged. Pure and read-only: it returns proposed items, it never writes anything.
 * Estimate items carry one quantity and a unit, so only unit-driven bases are supported here (AQC's Perimeter basis
 * needs length and breadth separately and is left to the take-off sheets).
 */
export type LinkBasis = "AREA" | "VOLUME" | "LENGTH" | "COUNT";
export type LinkRule = {
  id: string; name: string; enabled: boolean; sourceTrade: string; targetTrade: string;
  basis: LinkBasis; factor: number; targetUnit: string; perItem: boolean; notes?: string;
};
export type SourceItem = { id: string; mark: string; trade: string; quantity: number; unit: string };
export type DerivedItem = {
  ruleId: string; ruleName: string; sourceTrade: string; sourceMark: string; sourceItemId: string | null;
  basis: LinkBasis; sourceQty: number; factor: number; targetTrade: string; targetQty: number; targetUnit: string; chained: boolean;
};

export const DEFAULT_LINK_RULES: LinkRule[] = [
  { id: "msn-plaster", name: "Plaster from masonry (both faces)", enabled: true, sourceTrade: "Masonry", targetTrade: "Plaster", basis: "AREA", factor: 2, targetUnit: "m²", perItem: true, notes: "12 mm plaster on both faces of masonry walls." },
  { id: "plaster-paint", name: "Painting from plaster", enabled: true, sourceTrade: "Plaster", targetTrade: "Painting", basis: "AREA", factor: 1, targetUnit: "m²", perItem: true, notes: "Paint area follows plastered area 1:1." },
  { id: "floor-screed", name: "Screed bedding under flooring", enabled: false, sourceTrade: "Flooring", targetTrade: "Screed", basis: "AREA", factor: 1, targetUnit: "m²", perItem: true, notes: "Cement bedding below floor finish." },
  { id: "msn-dpc", name: "DPC along masonry base", enabled: false, sourceTrade: "Masonry", targetTrade: "DPC", basis: "LENGTH", factor: 1, targetUnit: "m", perItem: true, notes: "Plinth-level walls only." },
];

/** Which trade a free-text estimate item belongs to, by keyword (first match wins). */
const TRADE_KEYWORDS: [string, RegExp][] = [
  ["Plaster", /plaster|rendering/i],
  ["Painting", /paint|distemper|emulsion/i],
  ["Screed", /screed|bedding/i],
  ["Flooring", /floor|tile|granite|kota/i],
  ["DPC", /\bdpc\b|damp.?proof/i],
  ["Masonry", /masonry|brick|block\s?work|wall/i],
];
export function inferTrade(description: string): string | null {
  for (const [trade, re] of TRADE_KEYWORDS) if (re.test(description)) return trade;
  return null;
}

/** Which basis a measured quantity supplies, from its unit. */
export function basisForUnit(unit: string): LinkBasis | null {
  const u = unit.toLowerCase().replace(/\s/g, "");
  if (/^(sqm|m2|m²|sq\.?m)$/.test(u)) return "AREA";
  if (/^(cum|m3|m³|cu\.?m)$/.test(u)) return "VOLUME";
  if (/^(rm|m|rmt|mtr)$/.test(u)) return "LENGTH";
  if (/^(nos?|no\.?|each)$/.test(u)) return "COUNT";
  return null;
}

type Node = { mark: string; itemId: string | null; area: number; volume: number; length: number; count: number };
const drive = (n: Node, b: LinkBasis) => (b === "AREA" ? n.area : b === "VOLUME" ? n.volume : b === "LENGTH" ? n.length : n.count > 0 ? n.count : 1);

/** Kahn order of trades on source→target edges; rules sorted by their source's rank (cycles rank last). */
export function topoOrder(rules: LinkRule[]): LinkRule[] {
  const trades = new Set<string>();
  rules.forEach((r) => { trades.add(r.sourceTrade); trades.add(r.targetTrade); });
  const indeg = new Map([...trades].map((t) => [t, 0]));
  const adj = new Map([...trades].map((t) => [t, [] as string[]]));
  for (const r of rules) {
    if (r.sourceTrade === r.targetTrade) continue;
    adj.get(r.sourceTrade)!.push(r.targetTrade);
    indeg.set(r.targetTrade, (indeg.get(r.targetTrade) ?? 0) + 1);
  }
  const rank = new Map<string, number>();
  const queue = [...indeg].filter(([, d]) => d === 0).map(([t]) => t);
  let order = 0;
  while (queue.length) {
    const t = queue.shift()!;
    rank.set(t, order++);
    for (const next of adj.get(t) ?? []) {
      indeg.set(next, (indeg.get(next) ?? 0) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  for (const t of trades) if (!rank.has(t)) rank.set(t, order++);
  return [...rules].sort((a, b) => (rank.get(a.sourceTrade) ?? 1e9) - (rank.get(b.sourceTrade) ?? 1e9));
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function deriveLinkedItems(sources: SourceItem[], rules: LinkRule[] = DEFAULT_LINK_RULES): DerivedItem[] {
  const work = new Map<string, Node[]>();
  const add = (trade: string, node: Node) => work.set(trade, [...(work.get(trade) ?? []), node]);
  for (const s of sources) {
    const basis = basisForUnit(s.unit);
    if (!basis || s.quantity <= 0) continue;
    add(s.trade, { mark: s.mark, itemId: s.id, area: basis === "AREA" ? s.quantity : 0, volume: basis === "VOLUME" ? s.quantity : 0, length: basis === "LENGTH" ? s.quantity : 0, count: basis === "COUNT" ? s.quantity : 1 });
  }
  const seeded = new Set(work.keys());
  const results: DerivedItem[] = [];

  for (const rule of topoOrder(rules.filter((r) => r.enabled && r.sourceTrade && r.targetTrade))) {
    const src = work.get(rule.sourceTrade);
    if (!src?.length) continue;
    const chained = !seeded.has(rule.sourceTrade);
    const targetBasis = basisForUnit(rule.targetUnit) ?? "AREA";
    const asNode = (mark: string, itemId: string | null, qty: number): Node => ({
      mark, itemId, area: targetBasis === "AREA" ? qty : 0, volume: targetBasis === "VOLUME" ? qty : 0, length: targetBasis === "LENGTH" ? qty : 0, count: targetBasis === "COUNT" ? qty : 1,
    });
    const make = (mark: string, itemId: string | null, d: number) => {
      const tq = d * rule.factor;
      results.push({ ruleId: rule.id, ruleName: rule.name, sourceTrade: rule.sourceTrade, sourceMark: mark, sourceItemId: itemId, basis: rule.basis, sourceQty: round3(d), factor: rule.factor, targetTrade: rule.targetTrade, targetQty: round3(tq), targetUnit: rule.targetUnit, chained });
      return asNode(mark, itemId, tq);
    };
    const produced: Node[] = [];
    if (rule.perItem) {
      for (const s of src) {
        const d = drive(s, rule.basis);
        if (d > 0) produced.push(make(s.mark, s.itemId, d));
      }
    } else {
      const d = src.reduce((n, s) => n + drive(s, rule.basis), 0);
      if (d > 0) produced.push(make("ALL", null, d));
    }
    produced.forEach((p) => add(rule.targetTrade, p));
  }
  return results;
}

/** Estimate-item prefix marking a derived line — such lines are never used as sources again (the chain is already in the engine). */
export const LINKED_PREFIX = "Linked · ";

export type EstimateItemLite = { id: string; description: string; unit: string; quantity: number };
export type ProposedLine = DerivedItem & { description: string };

/** Proposed linked lines for an estimate's current items, minus those already present (matched on description). */
export function proposeLinkedLines(items: EstimateItemLite[], rules: LinkRule[] = DEFAULT_LINK_RULES): ProposedLine[] {
  const sources: SourceItem[] = [];
  for (const it of items) {
    if (it.description.startsWith(LINKED_PREFIX)) continue;
    const trade = inferTrade(it.description);
    if (trade) sources.push({ id: it.id, mark: it.description.slice(0, 40), trade, quantity: it.quantity, unit: it.unit });
  }
  const existing = new Set(items.map((i) => i.description));
  return deriveLinkedItems(sources, rules)
    .map((d) => ({ ...d, description: `${LINKED_PREFIX}${d.targetTrade} — ${d.ruleName} (${d.sourceMark})` }))
    .filter((d) => !existing.has(d.description));
}
