/**
 * Client–Project Intelligence (CPI) — residential onboarding & program-
 * formulation questionnaire (20 answerable sections + a synthesized report).
 * Ported directly from packages/contracts/src/cpi.ts (section ids/order,
 * report shape) and frontend/src/components/ProjectCpi.tsx (the actual
 * question set, SECTION_DEFS) — both are plain data with no MUI/tRPC
 * dependency, so the config carries over unchanged; only the rendering
 * layer (web/components/aorms/cpi/*) is new, built on Carbon instead of MUI.
 */

export type CpiSectionId =
  | "aboutYou"
  | "currentHome"
  | "dailyLife"
  | "lifestyleProfile"
  | "emotionalGoals"
  | "designPersonality"
  | "aestheticIntelligence"
  | "colourIntelligence"
  | "lightIntelligence"
  | "furnitureBehaviour"
  | "textureIntelligence"
  | "scaleIntelligence"
  | "storageIntelligence"
  | "kitchenIntelligence"
  | "bathroomIntelligence"
  | "technologyIntelligence"
  | "sustainabilityIntelligence"
  | "budgetIntelligence"
  | "projectPriorities"
  | "imageIntelligence";

export const CPI_SECTIONS: ReadonlyArray<{ id: CpiSectionId; no: number; title: string }> = [
  { id: "aboutYou", no: 1, title: "About You" },
  { id: "currentHome", no: 2, title: "Your Current Home" },
  { id: "dailyLife", no: 3, title: "Your Daily Life" },
  { id: "lifestyleProfile", no: 4, title: "Lifestyle Profile" },
  { id: "emotionalGoals", no: 5, title: "Emotional Goals" },
  { id: "designPersonality", no: 6, title: "Design Personality" },
  { id: "aestheticIntelligence", no: 7, title: "Aesthetic Intelligence" },
  { id: "colourIntelligence", no: 8, title: "Colour Intelligence" },
  { id: "lightIntelligence", no: 9, title: "Light Intelligence" },
  { id: "furnitureBehaviour", no: 10, title: "Furniture Behaviour" },
  { id: "textureIntelligence", no: 11, title: "Texture Intelligence" },
  { id: "scaleIntelligence", no: 12, title: "Scale Intelligence" },
  { id: "storageIntelligence", no: 13, title: "Storage Intelligence" },
  { id: "kitchenIntelligence", no: 14, title: "Kitchen Intelligence" },
  { id: "bathroomIntelligence", no: 15, title: "Bathroom Intelligence" },
  { id: "technologyIntelligence", no: 16, title: "Technology Intelligence" },
  { id: "sustainabilityIntelligence", no: 17, title: "Sustainability Intelligence" },
  { id: "budgetIntelligence", no: 18, title: "Budget Intelligence" },
  { id: "projectPriorities", no: 19, title: "Project Priorities" },
  { id: "imageIntelligence", no: 20, title: "Image Intelligence (Visual Calibration)" },
];

export const CPI_SECTION_MAX_BYTES = 32_000;

export type Field =
  | { kind: "text"; id: string; label: string }
  | { kind: "textarea"; id: string; label: string }
  | { kind: "rating"; id: string; label: string } // 1–5
  | { kind: "scale"; id: string; label: string; min?: number; max?: number }
  | { kind: "single"; id: string; label: string; options: readonly string[] }
  | { kind: "multi"; id: string; label: string; options: readonly string[]; max?: number }
  | { kind: "rank"; id: string; label: string; items: readonly string[] };

export type SectionDef = { id: CpiSectionId; intro?: string; fields: Field[] };

const RATE_5 = (id: string, label: string): Field => ({ kind: "rating", id, label });

export const SECTION_DEFS: SectionDef[] = [
  {
    id: "aboutYou",
    intro: "Who are the people this home is being designed for?",
    fields: [
      { kind: "textarea", id: "familyMembers", label: "Family members and ages" },
      { kind: "text", id: "occupations", label: "Occupations" },
      { kind: "textarea", id: "dailySchedules", label: "Daily schedules" },
      { kind: "text", id: "pets", label: "Pets" },
      { kind: "text", id: "frequentGuests", label: "Frequent guests" },
      { kind: "text", id: "domesticHelp", label: "Domestic help" },
      { kind: "text", id: "accessibility", label: "Elderly or accessibility requirements" },
      { kind: "textarea", id: "futurePlans", label: "Future family plans (5–10 years)" },
    ],
  },
  {
    id: "currentHome",
    fields: [
      { kind: "textarea", id: "love", label: "What do you love about your current home?" },
      { kind: "textarea", id: "frustrates", label: "What frustrates you every day?" },
      { kind: "text", id: "mostUsedRoom", label: "Which room do you spend the most time in?" },
      { kind: "text", id: "avoidedRoom", label: "Which room do you avoid?" },
      {
        kind: "textarea",
        id: "promise",
        label: "What have you promised yourself your next home will definitely have?",
      },
    ],
  },
  {
    id: "dailyLife",
    intro: "Walk us through a typical weekday.",
    fields: [
      { kind: "textarea", id: "morningRoutine", label: "Morning routine" },
      { kind: "textarea", id: "workRoutine", label: "Work routine" },
      { kind: "textarea", id: "eveningRoutine", label: "Evening routine" },
      { kind: "textarea", id: "weekendRoutine", label: "Weekend routine" },
      { kind: "text", id: "wakesFirst", label: "Who wakes up first?" },
      { kind: "text", id: "coffeeSpot", label: "Where do you drink coffee?" },
      { kind: "text", id: "childrenStudy", label: "Where do children study?" },
      { kind: "text", id: "entertainFrequency", label: "How often do you entertain?" },
      { kind: "text", id: "visitorCount", label: "How many people usually visit?" },
      { kind: "single", id: "cookDaily", label: "Do you cook daily?", options: ["Yes", "No"] },
      { kind: "single", id: "orderFood", label: "Do you order food often?", options: ["Yes", "No"] },
      { kind: "text", id: "storageNeeds", label: "How much storage do you need?" },
      { kind: "single", id: "workFromHome", label: "Do you work from home?", options: ["Yes", "No", "Sometimes"] },
    ],
  },
  {
    id: "lifestyleProfile",
    intro: "Rate from 1–5.",
    fields: [
      RATE_5("quietHome", "I like a quiet home"),
      RATE_5("entertaining", "I love entertaining guests"),
      RATE_5("openSpaces", "I prefer open spaces"),
      RATE_5("privacy", "I need privacy"),
      RATE_5("naturalLight", "I love natural light"),
      RATE_5("collectingArt", "I enjoy collecting art"),
      RATE_5("decorativeObjects", "I buy many decorative objects"),
      RATE_5("dislikeClutter", "I dislike clutter"),
      RATE_5("cooking", "I enjoy cooking"),
      RATE_5("technology", "Technology is important"),
      RATE_5("sustainability", "Sustainability matters"),
      RATE_5("lowMaintenance", "Maintenance should be minimal"),
    ],
  },
  {
    id: "emotionalGoals",
    intro: "When someone enters your home — how should they feel? Choose up to five.",
    fields: [
      {
        kind: "multi",
        id: "feelings",
        label: "Feelings",
        max: 5,
        options: [
          "Calm", "Luxurious", "Warm", "Elegant", "Minimal", "Cozy", "Grand",
          "Sophisticated", "Artistic", "Natural", "Bold", "Peaceful", "Energetic", "Timeless",
        ],
      },
    ],
  },
  {
    id: "designPersonality",
    intro: "Without thinking too much — choose one.",
    fields: [
      {
        kind: "single",
        id: "home",
        label: "Which home is you?",
        options: [
          "Home A — Simple, minimal, clean lines",
          "Home B — Warm, natural, textured",
          "Home C — Luxury hotel feeling",
          "Home D — Traditional craftsmanship",
          "Home E — Contemporary statement",
        ],
      },
    ],
  },
  {
    id: "aestheticIntelligence",
    fields: [
      {
        kind: "multi",
        id: "materials",
        label: "Which materials naturally attract you?",
        options: ["Marble", "Travertine", "Wood", "Concrete", "Metal", "Glass", "Brick", "Lime plaster", "Stone"],
      },
      {
        kind: "multi",
        id: "finishes",
        label: "Which finishes do you prefer?",
        options: ["Matte", "Satin", "Gloss", "Textured", "Rough", "Smooth"],
      },
      {
        kind: "multi",
        id: "dreamWords",
        label: "Which words describe your dream home? (choose 10)",
        max: 10,
        options: [
          "Calm", "Luxury", "Simple", "Organic", "Earthy", "Elegant", "Soft", "Bright", "Dark", "Moody",
          "Minimal", "Timeless", "Layered", "Artistic", "Modern", "Classic", "Warm", "Cold", "Bold", "Refined",
        ],
      },
    ],
  },
  {
    id: "colourIntelligence",
    intro: "Without naming colours — which environments make you happiest? (this indirectly reveals the palette)",
    fields: [
      {
        kind: "multi",
        id: "environments",
        label: "Environments",
        options: [
          "Forest", "Beach", "Desert", "Mountains", "Rain", "Snow", "City",
          "Countryside", "Historic town", "Luxury hotel",
        ],
      },
      { kind: "scale", id: "colourAmount", label: "How much colour do you enjoy? (neutral 1 → colourful 10)", min: 1, max: 10 },
      { kind: "text", id: "accentColours", label: "Preferred accent colours" },
      { kind: "text", id: "avoidedColours", label: "Avoided colours" },
      { kind: "text", id: "clothingColours", label: "Favourite clothing colours" },
      { kind: "text", id: "carColour", label: "Favourite car colour" },
      { kind: "text", id: "hotelInteriors", label: "Favourite hotel interiors" },
    ],
  },
  {
    id: "lightIntelligence",
    fields: [
      {
        kind: "multi",
        id: "preferences",
        label: "Do you prefer…",
        options: [
          "Bright daylight", "Soft daylight", "Dim mood lighting", "Warm lighting",
          "Cool lighting", "Indirect lighting", "Large windows", "Cozy corners",
        ],
      },
    ],
  },
  {
    id: "furnitureBehaviour",
    fields: [
      {
        kind: "multi",
        id: "preferences",
        label: "Do you prefer…",
        options: [
          "Few high-quality pieces", "Many decorative pieces", "Flexible furniture", "Built-in furniture",
          "Movable furniture", "Large sofas", "Formal seating", "Casual seating",
        ],
      },
    ],
  },
  {
    id: "textureIntelligence",
    intro: "Touch the samples and rate each 1–5.",
    fields: ["Wood", "Leather", "Linen", "Cotton", "Velvet", "Stone", "Concrete", "Brass", "Steel", "Glass"].map(
      (m) => RATE_5(m.toLowerCase(), m),
    ),
  },
  {
    id: "scaleIntelligence",
    fields: [
      {
        kind: "multi",
        id: "comfortable",
        label: "Which spaces feel comfortable?",
        options: [
          "Small intimate rooms", "Medium balanced rooms", "Large dramatic spaces", "Double-height ceilings",
          "Low ceilings", "Wide corridors", "Compact efficient planning",
        ],
      },
    ],
  },
  {
    id: "storageIntelligence",
    intro: "Rate each 1–5.",
    fields: [
      RATE_5("hiddenStorage", "Hidden storage"),
      RATE_5("displayShelving", "Display shelving"),
      RATE_5("walkInWardrobe", "Walk-in wardrobe"),
      RATE_5("pantry", "Pantry"),
      RATE_5("utilityRoom", "Utility room"),
      RATE_5("garageStorage", "Garage storage"),
      RATE_5("outdoorStorage", "Outdoor storage"),
    ],
  },
  {
    id: "kitchenIntelligence",
    fields: [
      { kind: "text", id: "whoCooks", label: "Who cooks?" },
      { kind: "text", id: "howOften", label: "How often?" },
      { kind: "text", id: "cuisine", label: "Cuisine" },
      { kind: "single", id: "heavyCooking", label: "Heavy cooking?", options: ["Yes", "No"] },
      { kind: "single", id: "spiceKitchen", label: "Separate spice kitchen?", options: ["Yes", "No"] },
      { kind: "single", id: "breakfastCounter", label: "Breakfast counter?", options: ["Yes", "No"] },
      { kind: "text", id: "diningFrequency", label: "Dining frequency?" },
    ],
  },
  {
    id: "bathroomIntelligence",
    fields: [
      { kind: "single", id: "spaFeeling", label: "Spa feeling?", options: ["Yes", "No"] },
      { kind: "single", id: "luxuryHotel", label: "Luxury hotel?", options: ["Yes", "No"] },
      { kind: "single", id: "easyMaintenance", label: "Easy maintenance?", options: ["Yes", "No"] },
      { kind: "single", id: "bathtub", label: "Bathtub?", options: ["Yes", "No"] },
      { kind: "single", id: "rainShower", label: "Rain shower?", options: ["Yes", "No"] },
      { kind: "single", id: "steamRoom", label: "Steam room?", options: ["Yes", "No"] },
    ],
  },
  {
    id: "technologyIntelligence",
    fields: [
      { kind: "single", id: "smartHome", label: "Smart home?", options: ["Yes", "No"] },
      { kind: "single", id: "voiceControl", label: "Voice control?", options: ["Yes", "No"] },
      { kind: "single", id: "automatedCurtains", label: "Automated curtains?", options: ["Yes", "No"] },
      { kind: "single", id: "security", label: "Security?", options: ["Yes", "No"] },
      { kind: "single", id: "solar", label: "Solar?", options: ["Yes", "No"] },
      { kind: "single", id: "homeTheatre", label: "Home theatre?", options: ["Yes", "No"] },
      { kind: "single", id: "evCharging", label: "EV charging?", options: ["Yes", "No"] },
    ],
  },
  {
    id: "sustainabilityIntelligence",
    intro: "Importance, 1–10.",
    fields: [
      { kind: "scale", id: "rainwaterHarvesting", label: "Rainwater harvesting", min: 1, max: 10 },
      { kind: "scale", id: "solar", label: "Solar", min: 1, max: 10 },
      { kind: "scale", id: "naturalVentilation", label: "Natural ventilation", min: 1, max: 10 },
      { kind: "scale", id: "lowVoc", label: "Low VOC materials", min: 1, max: 10 },
      { kind: "scale", id: "localMaterials", label: "Local materials", min: 1, max: 10 },
      { kind: "scale", id: "energyEfficiency", label: "Energy efficiency", min: 1, max: 10 },
    ],
  },
  {
    id: "budgetIntelligence",
    intro: "Rank the investment priorities (1 = highest).",
    fields: [
      {
        kind: "rank",
        id: "priorities",
        label: "Investment priorities",
        items: ["Kitchen", "Bathrooms", "Lighting", "Furniture", "Landscape", "Stone", "Wardrobes", "Automation", "Art"],
      },
    ],
  },
  {
    id: "projectPriorities",
    intro: "Rank the project priorities (1 = highest).",
    fields: [
      {
        kind: "rank",
        id: "priorities",
        label: "Project priorities",
        items: ["Beauty", "Function", "Longevity", "Budget", "Luxury", "Speed", "Sustainability", "Maintenance"],
      },
    ],
  },
  {
    id: "imageIntelligence",
    intro:
      "Run after the verbal questionnaire, with curated boards (20–30 images per category). Score each category's board 1–5 (1 = strongly dislike, 5 = love / must-have) and record what specifically appeals or repels — materials, lighting, proportions, colours, furniture, textures.",
    fields: [
      ...[
        "Living rooms", "Kitchens", "Bedrooms", "Bathrooms", "Staircases", "Dining rooms", "Home offices",
        "Outdoor spaces", "Facades", "Entry foyers", "Lighting", "Furniture", "Material palettes", "Flooring",
        "Ceiling designs", "Window styles", "Hardware", "Landscapes", "Art displays", "Storage solutions",
      ].map((c) => RATE_5(c.toLowerCase().replace(/\s+/g, "-"), c)),
      { kind: "textarea", id: "notes", label: "What specifically appeals or repels (per board)" },
    ],
  },
];

export const SECTION_TITLE = new Map(CPI_SECTIONS.map((s) => [s.id, `${s.no} — ${s.title}`]));

/** Section 21 — the Designer's Intelligence Report (the CPI deliverable). */
export type CpiReportShape = {
  designDna: string;
  colourPalette: string;
  materialPreferences: string;
  spatialPreferences: string;
  lightingPreferences: string;
  lifestyleDrivers: string;
  luxuryPriorities: string;
  avoidances: string;
  summary: string;
};

export const CPI_REPORT_FIELDS: ReadonlyArray<{ key: keyof CpiReportShape; label: string }> = [
  { key: "designDna", label: "Design DNA" },
  { key: "colourPalette", label: "Colour Palette" },
  { key: "materialPreferences", label: "Material Preferences" },
  { key: "spatialPreferences", label: "Spatial Preferences" },
  { key: "lightingPreferences", label: "Lighting Preferences" },
  { key: "lifestyleDrivers", label: "Lifestyle Drivers" },
  { key: "luxuryPriorities", label: "Luxury Priorities" },
  { key: "avoidances", label: "Avoidances" },
  { key: "summary", label: "Brief Summary" },
];

export const EMPTY_REPORT: CpiReportShape = {
  designDna: "",
  colourPalette: "",
  materialPreferences: "",
  spatialPreferences: "",
  lightingPreferences: "",
  lifestyleDrivers: "",
  luxuryPriorities: "",
  avoidances: "",
  summary: "",
};
