import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ALLOWED_COLORS = [
  "Midori",
  "Soft Blue",
  "Burgundy",
  "Burnt Orange",
  "Rakuda",
  "Ivory",
  "Grey/Silver",
  "Gold",
  "Sumi Black",
  "Dark Blue",
  "Sakura"
];

const ELEMENT_TO_COLORS = {
  wood: ["Midori", "Soft Blue"],
  fire: ["Burgundy", "Burnt Orange"],
  earth: ["Rakuda", "Ivory"],
  metal: ["Grey/Silver", "Gold"],
  water: ["Sumi Black", "Dark Blue"],
  love: ["Sakura"]
};

const ELEMENT_LABELS = {
  wood: "Wood",
  fire: "Fire",
  earth: "Earth",
  metal: "Metal",
  water: "Water",
  love: "Love"
};

const COLOR_TO_ELEMENT = {
  "Midori": "wood",
  "Soft Blue": "wood",
  "Burgundy": "fire",
  "Burnt Orange": "fire",
  "Rakuda": "earth",
  "Ivory": "earth",
  "Grey/Silver": "metal",
  "Gold": "metal",
  "Sumi Black": "water",
  "Dark Blue": "water",
  "Sakura": "love"
};

const THEME_HINTS = {
  "need-rest": "Rest and quiet recovery",
  "need-clarity": "Clarity and mental order",
  "need-confidence": "Confidence and self-trust",
  "need-softness": "Softness and emotional ease",
  "need-momentum": "Momentum and renewed movement"
};

function parseBirthDate(value) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/*
  Simplified mapping:
  - This is not orthodox Four Pillars.
  - It is a lightweight symbolic model for product diagnosis.
  - Month is used as a stable proxy to avoid fake precision.
*/
function getBaseElementFromBirthDate(birthDate) {
  const date = parseBirthDate(birthDate);
  if (!date) return null;

  const month = date.getUTCMonth() + 1;

  if ([2, 3].includes(month)) return "wood";
  if ([4, 5].includes(month)) return "fire";
  if ([6, 7, 8].includes(month)) return "earth";
  if ([9, 10].includes(month)) return "metal";
  return "water";
}

function getRecommendedColor(baseElement, selectedColor) {
  const recommendedPool = ELEMENT_TO_COLORS[baseElement] || ["Ivory"];

  if (!selectedColor) return recommendedPool[0];

  const selectedElement = COLOR_TO_ELEMENT[selectedColor];

  if (!selectedElement) return recommendedPool[0];

  // If the selected color already belongs to the user's balancing element,
  // keep it and let the interpretation explain reinforcement rather than contrast.
  if (selectedElement === baseElement) return selectedColor;

  return recommendedPool[0];
}

function getGapSummary(baseElement, selectedColor, currentTheme) {
  const selectedElement = COLOR_TO_ELEMENT[selectedColor] || null;
  const explicitTheme = THEME_HINTS[currentTheme] || null;

  if (explicitTheme) return explicitTheme;

  if (!selectedColor || !selectedElement || !baseElement) {
    return "Returning to inner balance";
  }

  if (selectedElement === baseElement) {
    return "Reinforcing what already wants to emerge";
  }

  const pairKey = `${selectedElement}->${baseElement}`;

  const gapMap = {
    "fire->earth": "Settling intensity into steadiness",
    "fire->water": "Cooling what has been overextended",
    "fire->metal": "Turning force into clear decisions",
    "fire->wood": "Redirecting passion into growth",

    "wood->earth": "Grounding scattered growth",
    "wood->water": "Restoring depth beneath movement",
    "wood->metal": "Giving direction to possibility",
    "wood->fire": "Activating what has stayed potential",

    "earth->fire": "Reawakening expression and courage",
    "earth->water": "Making room for inner stillness",
    "earth->metal": "Refining what has become too heavy",
    "earth->wood": "Inviting renewal and flexibility",

    "metal->earth": "Softening pressure into stability",
    "metal->water": "Creating space for reflection",
    "metal->wood": "Loosening rigidity into growth",
    "metal->fire": "Bringing warmth back into action",

    "water->earth": "Giving structure to deep feeling",
    "water->fire": "Bringing hidden energy into motion",
    "water->metal": "Sharpening what has stayed inward",
    "water->wood": "Turning reflection into renewal",

    "love->earth": "Returning tenderness to something solid",
    "love->metal": "Bringing grace into clearer boundaries",
    "love->water": "Making softness feel safe again",
    "love->fire": "Allowing affection to become expression",
    "love->wood": "Letting care become new growth"
  };

  return gapMap[pairKey] || "Returning to inner balance";
}

const SYSTEM_PROMPT = `
You are a precise luxury color diagnostic writer.

You are not a fortune teller.
You do not claim certainty, fate, medical truth, therapy, or guaranteed outcomes.
You do not use mystical exaggeration.

Your job:
- Interpret a structured symbolic color diagnosis
- Keep the tone refined, elegant, emotionally accurate, and believable
- Make the result feel premium and personal
- Support product desirability without sounding salesy

Important rules:
- Use only the allowed colors exactly as written
- Do not invent new colors
- Do not say "100%", "destiny", "fate", "healing", "manifest", "aura", "vibration", or "universe"
- Do not frame the user as broken
- Present the result as a balancing insight, not a fixed truth
- Keep it concise and expensive in tone

Output exactly in this format:

Recommended Color: [allowed color only]
Present Theme: [max 6 words]
Message: [1-2 sentences, elegant, grounded]
Styling Suggestion: [1 sentence suggesting how to incorporate the color into daily life, wardrobe, accessory, robe, interior, etc.]
`.trim();

app.post("/api/generate-reading", async (req, res) => {
  try {
    const {
      birthDate = "",
      selectedColor = "",
      currentTheme = ""
    } = req.body || {};

    const safeSelectedColor = ALLOWED_COLORS.includes(selectedColor) ? selectedColor : "";
    const baseElement = getBaseElementFromBirthDate(birthDate) || "earth";
    const recommendedColor = getRecommendedColor(baseElement, safeSelectedColor);
    const gapSummary = getGapSummary(baseElement, safeSelectedColor, currentTheme);

    const userPrompt = `
Create a refined symbolic color reading using the structured logic below.

Allowed colors:
${ALLOWED_COLORS.join(", ")}

Inputs:
- Birth date: ${birthDate || "Not provided"}
- Base element from simplified logic: ${ELEMENT_LABELS[baseElement]}
- Currently chosen color: ${safeSelectedColor || "Not provided"}
- Present theme summary: ${gapSummary}
- Recommended balancing color: ${recommendedColor}

Interpretation rules:
- The base element is the balancing anchor
- The selected color reflects what the user is currently drawn toward
- The gap between them should be framed as a present-life theme, not a flaw
- Keep the writing premium, calm, and psychologically believable
- The Recommended Color must remain exactly: ${recommendedColor}

Good direction:
- emotionally precise
- restrained
- luxurious
- non-mystical
- not generic

Output exactly in the required format.
`.trim();

    const response = await client.responses.create({
      model: "gpt-4o",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_output_tokens: 220
    });

    const text =
      response.output_text?.trim() ||
      `Recommended Color: ${recommendedColor}
Present Theme: ${gapSummary}
Message: What you need now is not more force, but a quieter return to what steadies you.
Styling Suggestion: Bring this color into a robe, small accessory, or calm corner of your home.`;

    res.json({ text });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({
      text: `Recommended Color: Ivory
Present Theme: Returning to inner balance
Message: This is a moment to choose what steadies you, not what overwhelms you.
Styling Suggestion: Introduce Ivory through something soft, close to the body, or quietly visible at home.`
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
