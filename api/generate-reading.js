import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const COLORS = [
  { id: "midori", label: "Green", value: "Midori", element: "wood" },
  { id: "soft-blue", label: "Light Blue", value: "Soft Blue", element: "wood" },

  { id: "burgundy", label: "Wine", value: "Burgundy", element: "fire" },
  { id: "sakura", label: "Pink", value: "Sakura", element: "fire" },

  { id: "rakuda", label: "Camel / Beige", value: "Rakuda", element: "earth" },
  { id: "ivory", label: "Ivory", value: "Ivory", element: "earth" },

  { id: "grey-silver", label: "Silver", value: "Grey/Silver", element: "metal" },
  { id: "gold", label: "Gold", value: "Gold", element: "metal" },

  { id: "sumi-black", label: "Black", value: "Sumi Black", element: "water" },
  { id: "dark-blue", label: "Navy", value: "Dark Blue", element: "water" }
];

const COLOR_BY_VALUE = Object.fromEntries(COLORS.map((c) => [c.value, c]));

function parseBirthDate(value) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getBaseElementFromBirthDate(birthDate) {
  const date = parseBirthDate(birthDate);
  if (!date) return "earth";

  const month = date.getUTCMonth() + 1;

  if ([2, 3].includes(month)) return "wood";
  if ([4, 5].includes(month)) return "fire";
  if ([6, 7, 8].includes(month)) return "earth";
  if ([9, 10].includes(month)) return "metal";
  return "water";
}

function getDayInfluence(birthDate) {
  const date = parseBirthDate(birthDate);
  if (!date) return "steady";

  const day = date.getUTCDate();

  if ([1, 5, 9, 13, 17, 21, 25, 29].includes(day)) return "soft";
  if ([2, 6, 10, 14, 18, 22, 26, 30].includes(day)) return "sharp";
  if ([3, 7, 11, 15, 19, 23, 27, 31].includes(day)) return "bold";
  return "deep";
}

function scoreColors(baseElement, selectedColor, dayInfluence) {
  const selected = COLOR_BY_VALUE[selectedColor] || null;

  return COLORS.map((color) => {
    let score = 0;

    if (color.element === baseElement) score += 4;
    if (selected && color.element !== selected.element) score += 2;
    if (selected && color.value === selected.value) score -= 2;

    if (dayInfluence === "soft" && ["Ivory", "Soft Blue", "Sakura", "Rakuda"].includes(color.value)) score += 2;
    if (dayInfluence === "sharp" && ["Grey/Silver", "Gold", "Sumi Black"].includes(color.value)) score += 2;
    if (dayInfluence === "bold" && ["Burgundy", "Midori", "Gold"].includes(color.value)) score += 2;
    if (dayInfluence === "deep" && ["Dark Blue", "Sumi Black", "Burgundy"].includes(color.value)) score += 2;

    if (selected) {
      if (selected.value === "Burgundy" && ["Ivory", "Dark Blue", "Grey/Silver"].includes(color.value)) score += 1;
      if (selected.value === "Sakura" && ["Grey/Silver", "Sumi Black", "Ivory"].includes(color.value)) score += 1;

      if (selected.value === "Rakuda" && ["Burgundy", "Gold", "Midori"].includes(color.value)) score += 1;
      if (selected.value === "Ivory" && ["Burgundy", "Gold", "Midori"].includes(color.value)) score += 1;

      if (selected.value === "Grey/Silver" && ["Rakuda", "Sakura", "Ivory"].includes(color.value)) score += 1;
      if (selected.value === "Gold" && ["Dark Blue", "Rakuda", "Soft Blue"].includes(color.value)) score += 1;

      if (selected.value === "Sumi Black" && ["Sakura", "Ivory", "Soft Blue"].includes(color.value)) score += 1;
      if (selected.value === "Dark Blue" && ["Gold", "Rakuda", "Burgundy"].includes(color.value)) score += 1;

      if (selected.value === "Midori" && ["Grey/Silver", "Ivory", "Dark Blue"].includes(color.value)) score += 1;
      if (selected.value === "Soft Blue" && ["Gold", "Burgundy", "Midori"].includes(color.value)) score += 1;
    }

    return { ...color, score };
  }).sort((a, b) => b.score - a.score);
}

function getReason(selectedColor, resultColor) {
  const pair = `${selectedColor || "none"}->${resultColor}`;

  const reasonMap = {
    "Burgundy->Ivory": "You are drawn to intensity, but need steadiness.",
    "Burgundy->Dark Blue": "You are pushing forward, but need deeper rest.",
    "Burgundy->Grey/Silver": "You are carrying heat, but need clean decisions.",

    "Sakura->Grey/Silver": "You are drawn to softness, but need clearer boundaries.",
    "Sakura->Sumi Black": "You are reaching outward, but need stronger inner protection.",
    "Sakura->Ivory": "You are looking for comfort, but need calm stability.",

    "Rakuda->Burgundy": "You are staying safe, but need more honest expression.",
    "Rakuda->Gold": "You are staying low, but need to take up space.",
    "Rakuda->Midori": "You are staying still, but need renewed movement.",

    "Ivory->Burgundy": "You are choosing calm, but need stronger self-expression.",
    "Ivory->Gold": "You are choosing quiet, but need more visibility.",
    "Ivory->Midori": "You are holding back, but need fresh movement.",

    "Grey/Silver->Rakuda": "You are choosing control, but need grounding.",
    "Grey/Silver->Sakura": "You are staying sharp, but need softness.",
    "Grey/Silver->Ivory": "You are clearing everything, but need relief too.",

    "Gold->Dark Blue": "You are drawn to visibility, but need inward rest.",
    "Gold->Rakuda": "You are reaching upward, but need grounding first.",
    "Gold->Soft Blue": "You are pushing to shine, but need less noise.",

    "Sumi Black->Sakura": "You are protecting yourself, but need softness to remain.",
    "Sumi Black->Ivory": "You are hiding in strength, but need gentler steadiness.",
    "Sumi Black->Soft Blue": "You are going deep, but need mental ease.",

    "Dark Blue->Gold": "You are turning inward, but need to be seen.",
    "Dark Blue->Rakuda": "You are staying deep, but need firmer ground.",
    "Dark Blue->Burgundy": "You are staying quiet, but need more expression.",

    "Midori->Grey/Silver": "You are ready to grow, but need sharper focus.",
    "Midori->Ivory": "You are moving outward, but need steadiness.",
    "Midori->Dark Blue": "You are reaching forward, but need deeper rest.",

    "Soft Blue->Gold": "You are seeking calm, but need stronger presence.",
    "Soft Blue->Burgundy": "You are staying quiet, but need more fire.",
    "Soft Blue->Midori": "You are softening, but need momentum."
  };

  const fallbackByColor = {
    "Midori": "You need movement, renewal, and a looser grip.",
    "Soft Blue": "You need less noise and more mental space.",
    "Burgundy": "You need stronger expression and less self-editing.",
    "Sakura": "You need softness without losing yourself.",
    "Rakuda": "You need grounding and a steadier pace.",
    "Ivory": "You need simplicity, relief, and room to breathe.",
    "Grey/Silver": "You need clarity, clean choices, and less excess.",
    "Gold": "You need visibility and fuller self-worth.",
    "Sumi Black": "You need inner protection and a stronger center.",
    "Dark Blue": "You need honest rest and deeper quiet."
  };

  return reasonMap[pair] || fallbackByColor[resultColor] || "You need a more balanced direction right now.";
}

function getTheme(resultColor, selectedColor) {
  const pair = `${selectedColor || "none"}->${resultColor}`;

  const map = {
    "Burgundy->Ivory": "Put it down",
    "Burgundy->Dark Blue": "Rest more deeply",
    "Burgundy->Grey/Silver": "Cut the excess",
    "Ivory->Burgundy": "Say it clearly",
    "Ivory->Gold": "Take up space",
    "Ivory->Midori": "Move again",
    "Dark Blue->Gold": "Be seen properly",
    "Dark Blue->Rakuda": "Come back down",
    "Dark Blue->Burgundy": "Stop swallowing it",
    "Sumi Black->Sakura": "Let softness stay",
    "Sumi Black->Ivory": "Rest without hiding",
    "Sumi Black->Soft Blue": "Need less noise",
    "Gold->Dark Blue": "Need less performance",
    "Gold->Rakuda": "Ground the pressure",
    "Gold->Soft Blue": "Quiet the mind",
    "Grey/Silver->Rakuda": "Soften the edges",
    "Grey/Silver->Sakura": "Let softness in",
    "Grey/Silver->Ivory": "Put it down",
    "Soft Blue->Gold": "Stop shrinking yourself",
    "Soft Blue->Burgundy": "Bring back fire",
    "Soft Blue->Midori": "Grow again",
    "Midori->Grey/Silver": "Choose cleanly",
    "Midori->Ivory": "Steady yourself",
    "Midori->Dark Blue": "Rest more honestly",
    "Sakura->Grey/Silver": "Protect your softness",
    "Sakura->Sumi Black": "Hold your center",
    "Sakura->Ivory": "Keep it gentle"
  };

  const fallbackByColor = {
    "Midori": "Grow again",
    "Soft Blue": "Need less noise",
    "Burgundy": "Stop swallowing it",
    "Sakura": "Let softness stay",
    "Rakuda": "Come back down",
    "Ivory": "Put it down",
    "Grey/Silver": "Choose cleanly",
    "Gold": "Be seen properly",
    "Sumi Black": "Keep your center",
    "Dark Blue": "Rest more honestly"
  };

  return map[pair] || fallbackByColor[resultColor] || "Return to yourself";
}

const SYSTEM_PROMPT = `
You write extremely short, sharp, unforgettable color readings.

The result must feel:
- simple
- clear
- slightly confronting
- elegant
- specific

Do not sound poetic, spiritual, vague, or therapeutic.
Do not use these words:
energy, healing, universe, destiny, vibration, alignment, manifest, gentle balance, deeper clarity

Output exactly in this format:

Color: [allowed color only]
Reason: [1 short sentence, simple and logical]
Theme: [2 to 4 words]
Message: [1 sentence only, max 9 words]

The Color must remain exactly the provided result.
The Reason must remain logically aligned with the provided reason.
The Theme must remain exactly the provided theme.
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ text: "Method Not Allowed" });
  }

  try {
    const { birthDate = "", selectedColor = "" } = req.body || {};

    const safeSelectedColor = COLOR_BY_VALUE[selectedColor] ? selectedColor : "";
    const baseElement = getBaseElementFromBirthDate(birthDate);
    const dayInfluence = getDayInfluence(birthDate);
    const ranked = scoreColors(baseElement, safeSelectedColor, dayInfluence);

    const resultColor = ranked
