// Generates pilot-sample.bbsproj — a synthetic G+1 residence in AQC-Core's `.bbsproj` v17 layout.
// Top-level keys, project/party/contract/bill/schedule/link-rule shapes follow ProjectStore.ToJson and the
// models' ToJson in HolagundiWorks/AQC. Take-off rows are schemaless string dictionaries in AQC; the field
// names below are best-effort (see README.md) and carry no row ids — exactly like a real save.
import { writeFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";

const s = (v) => String(v);
const row = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, s(v)]));
const id = (n) => `pilot${String(n).padStart(4, "0")}`;

const link = (pred, type = "FS", lag = 0) => ({ pred, type, lag });
const act = (n, name, duration, percent, wbs, links = []) => ({ id: id(n), name, duration, percent, wbs, x: null, y: null, links });

const bill = (n, number, date, lines, extra = {}) => ({
  id: id(100 + n), number, bill_no: n, issued_by: "contractor", date, contract_id: id(200), contract_label: "WO/2026/001",
  party: "Sri Lakshmi Constructions", retention_pct: 5, other_deductions: 0, advance_recovery: 0, gst_pct: 18, tds_pct: 2, cess_pct: 1,
  gst_tds_pct: 0, certified: 1, lines, created_utc: `${date}T09:00:00.0000000Z`, ...extra,
});

const project = {
  format: "bbsproj",
  version: 17,
  name: "Test Residence — Pilot Sample",
  project: {
    name: "Test Residence — Pilot Sample", location: "Hosapete, Karnataka", client_name: "Mr. Ravi Kumar",
    prepared_by_role: "Architect", prepared_by_name: "Test Architect", company_name: "Aurelia Design Collective",
    contact_phone: "+91 90000 00000", contact_email: "studio@example.invalid", address: "12 MG Road, Hosapete",
    gstin: "29ABCDE1234F1Z5", cin: "", pan: "ABCDE1234F", logo_path: "", hub_project_id: "",
  },
  parties: {
    active: "pm",
    pm: { id: id(1), role: "pm", company: "Aurelia Design Collective", signatory_name: "Test Architect", signatory_role: "Project Manager", address: "12 MG Road, Hosapete", phone: "", email: "", gstin: "29ABCDE1234F1Z5", pan: "ABCDE1234F", number_prefix: "ADC", logo_path: "" },
    contractor: { id: id(2), role: "contractor", company: "Sri Lakshmi Constructions", signatory_name: "S. Lakshmi", signatory_role: "Proprietor", address: "4 Station Road, Hosapete", phone: "", email: "", gstin: "29FGHIJ5678K1Z2", pan: "FGHIJ5678K", number_prefix: "SLC", logo_path: "" },
  },
  estimate_markups: { electrical_pct: 8, plumbing_pct: 6, escalation_pct: 5, consulting_fee_pct: 3 },
  concrete_from_rmc: 1,
  settings: {
    diameters: [8, 10, 12, 16, 20, 25], hook_allowance: { 90: 9, 135: 10, 180: 16 }, bend_deduction: { 45: 1, 90: 2, 135: 3 },
    hysd_bond: 1, hysd_bond_factor: 1.6, min_hook_mm: 75,
    covers: { column: 40, beam: 25, slab: 20, footing: 50, pedestal: 50, lintel: 25 },
    default_column_lap: "No", default_beam_lap: "None",
    tau_bd: { M20: 1.2, M25: 1.4, M30: 1.5, M35: 1.7, M40: 1.9 }, fy: { Fe250: 250, Fe415: 415, Fe500: 500, Fe550: 550 },
    civil_yields: { bricks_per_m3: 500, bricks_per_m2_half: 55, mortar_fraction: 0.3, ssm_mortar_fraction: 0.3, mortar_dry_factor: 1.33, wastage: 1.05, shuttering_wastage: 1.05, ignore_opening_below_m2: 0.1, beam_slab_interface_deduct: 0, wall_plaster_faces: 2, default_column_sides_exposed: 3, default_plaster_ceiling: 0, default_beam_soffit: 0 },
  },
  levels: [
    { id: "Lvl0", name: "Plinth", height_mm: 3200, slab_thickness_mm: 150, beam_depth_mm: 450 },
    { id: "Lvl1", name: "First floor", height_mm: 3000, slab_thickness_mm: 150, beam_depth_mm: 450 },
  ],
  columns: [
    row({ mark: "C1", nos: 6, level: "Lvl0", column_type: "Rectangular", width: 230, depth: 450, concrete: "M25", steel: "Fe500", main_bars: "4-16,2-12", tie_dia: 8, tie_spacing: 150 }),
    row({ mark: "C2", nos: 4, level: "Lvl1", column_type: "Rectangular", width: 230, depth: 380, concrete: "M25", steel: "Fe500", main_bars: "6-12", tie_dia: 8, tie_spacing: 150 }),
  ],
  beams: [
    row({ mark: "B1", nos: 6, level: "Lvl1", span: 3600, width: 230, depth: 450, concrete: "M25", steel: "Fe500", bottom_bars: "3-16", top_bars: "2-12", stirrup_dia: 8, stirrup_spacing: 150 }),
    row({ mark: "B2", nos: 4, level: "Lvl1", span: 4200, width: 230, depth: 450, concrete: "M25", steel: "Fe500", bottom_bars: "3-16,1-12", top_bars: "2-12", stirrup_dia: 8, stirrup_spacing: 150 }),
  ],
  pedestals: [], lintels: [],
  slabs: [row({ mark: "S1", nos: 1, level: "Lvl1", length: 9000, breadth: 7200, thickness: 150, concrete: "M25", steel: "Fe500", main_dia: 10, main_spacing: 150, dist_dia: 8, dist_spacing: 200 })],
  footings: [row({ mark: "F1", nos: 10, level: "Lvl0", length: 1500, breadth: 1500, depth: 450, concrete: "M25", steel: "Fe500", bar_dia: 12, bar_spacing: 150 })],
  walls: [], stairs: [],
  masonry: [
    row({ mark: "MW1", level: "Lvl0", length: 18000, height: 3000, thickness: 230, unit_type: "Brick", mortar_mix: "1:6", deduct_rule: "IS1200 masonry" }),
    row({ mark: "MW2", level: "Lvl1", length: 16000, height: 2900, thickness: 115, unit_type: "Brick", mortar_mix: "1:4", deduct_rule: "IS1200 masonry" }),
  ],
  masonry_openings: [
    row({ wall_mark: "MW1", level: "Lvl0", nos: 2, opening_l: 1000, opening_h: 2100 }),
    row({ wall_mark: "MW1", level: "Lvl0", nos: 4, opening_l: 1200, opening_h: 1200 }),
    row({ wall_mark: "MW2", level: "Lvl1", nos: 3, opening_l: 900, opening_h: 2100 }),
  ],
  plaster: [row({ mark: "PL1", wall_mark: "MW1", level: "Lvl0", length: 18000, height: 3000, thickness: 12, mortar_mix: "1:4", faces: 2 })],
  finish_propose: [],
  pcc: [row({ mark: "PCC1", level: "Lvl0", length: 12000, breadth: 9000, thickness: 100, mix: "1:4:8" })],
  earthwork: [row({ mark: "EW1", level: "Lvl0", length: 14000, breadth: 11000, depth: 1500 })],
  ssm: [], shuttering: [],
  flooring: [row({ mark: "FL1", level: "Lvl1", length: 9000, breadth: 7200, finish_type: "Vitrified tiles", surface_kind: "Floor" })],
  painting: [row({ mark: "PT1", wall_mark: "MW1", level: "Lvl0", length: 18000, height: 3000, paint_type: "Emulsion", coats: 2, faces: 2 })],
  waterproofing: [], dpc: [row({ mark: "DPC1", level: "Lvl0", length: 18000, width: 230 })], coping: [], screed: [], vdf: [],
  skirting: [row({ mark: "SK1", level: "Lvl1", length: 32000, height: 100 })], parapet: [], plinth_protection: [],
  doors: [row({ mark: "D1", wall_mark: "MW1", level: "Lvl0", nos: 2, width: 1000, height: 2100 })],
  windows: [row({ mark: "W1", wall_mark: "MW1", level: "Lvl0", nos: 4, width: 1200, height: 1200 })],
  takeoff: { pdf_path: "", page: 0, mm_per_px: 0, items: [] },
  schedule: {
    start_date: "2026-11-02", working_days_per_week: 6,
    activities: [
      act(10, "Site clearance and setting out", 5, 100, "1.1"),
      act(11, "Excavation and PCC", 10, 100, "1.2", [link(id(10))]),
      act(12, "Footings and plinth beam", 20, 60, "2.1", [link(id(11))]),
      act(13, "Plinth masonry and DPC", 8, 0, "2.2", [link(id(12))]),
      act(14, "Ground-floor columns", 12, 0, "3.1", [link(id(12), "SS", 10)]),
      act(15, "First-floor beams and slab", 24, 0, "3.2", [link(id(14))]),
      act(16, "Superstructure masonry", 18, 0, "4.1", [link(id(15), "SS", 10)]),
      act(17, "Plaster, flooring and paint", 30, 0, "5.1", [link(id(16)), link(id(15))]),
    ],
  },
  office: { prefix: "ADC", counters: {}, documents: [{ id: id(300), type: "LTR", number: "ADC/LTR/2026-27/001", issued_by: "pm", issue_date: "2026-10-20", to_name: "Sri Lakshmi Constructions", to_address: "4 Station Road, Hosapete", subject: "Work order — Test Residence", body: "Please find the work order enclosed.", signatory_name: "Test Architect", signatory_role: "Project Manager", finalized: 1, created_utc: "2026-10-20T09:00:00.0000000Z" }] },
  contracts: {
    prefix: "ADC", counters: {},
    contracts: [{ id: id(200), number: "WO/2026/001", issued_by: "pm", kind: 0, title: "Structure and masonry", contractor_name: "Sri Lakshmi Constructions", contractor_address: "4 Station Road, Hosapete", scope: "RCC frame, masonry, plaster", award_date: "2026-10-25", completion_date: "2027-04-30", lump_sum_value: 0, retention_pct: 5, lines: [
      { description: "PCC 1:4:8", unit: "cum", qty: 54, rate: 5200 }, { description: "RCC M25", unit: "cum", qty: 62, rate: 9800 }, { description: "Brick masonry 230", unit: "cum", qty: 41, rate: 6400 },
    ], terms: ["Payment within 15 days of certification.", "Retention 5% released at completion."], finalized: 1, created_utc: "2026-10-25T09:00:00.0000000Z" }],
    rates: [], terms: [],
  },
  accounts: {
    prefix: "SLC", opening_cash: 0, opening_bank: 0, counters: {},
    bills: [
      bill(1, "SLC/RA/2026-27/001", "2026-12-15", [
        { description: "PCC 1:4:8", unit: "cum", rate: 5200, qty: 54 }, { description: "RCC M25 (footings)", unit: "cum", rate: 9800, qty: 18 },
      ]),
    ],
    transactions: [{ id: id(400), date: "2026-12-30", issued_by: "pm", kind: 1, account: 1, party: "Sri Lakshmi Constructions", category: "RA bill", description: "RA 1 part payment", amount: 250000, reference: "UTR-TEST-001" }],
  },
  stores: { suppliers: [{ id: id(500), name: "Test Cement Depot", contact: "", gstin: "", address: "Hosapete" }], warehouses: [{ id: id(501), name: "Site store", location: "Plot" }], orders: [], grns: [], issues: [], counters: {} },
  org: { working_days: 26, sites: [{ id: id(600), name: "Test Residence", location: "Hosapete", manager: "Site Engineer", status: "Active" }], resources: [{ id: id(601), kind: "Labour", name: "Mason", unit: "day", rate: 900 }], employees: [], payroll: [] },
  link_rules: [
    { id: "msn-plaster", name: "Plaster from masonry (both faces)", enabled: 1, source: "Masonry", target: "Plaster", basis: "Area", factor: 2, target_unit: "m²", per_item: 1, rate_code: "", rate_override: 0, notes: "" },
    { id: "plaster-paint", name: "Painting from plaster", enabled: 1, source: "Plaster", target: "Painting", basis: "Area", factor: 1, target_unit: "m²", per_item: 1, rate_code: "", rate_override: 0, notes: "" },
  ],
  last_estimate: null,
  last_estimate_rate_book_version_id: "",
};

writeFileSync(fileURLToPath(new URL("./pilot-sample.bbsproj", import.meta.url)), JSON.stringify(project, null, 2) + "\n");
process.stdout.write("wrote pilot-sample.bbsproj\n");
