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

const COLOR_TO_ELEMENT = {
  Midori: "wood",
  "Soft Blue": "wood",
  Burgundy: "fire",
  "Burnt Orange": "fire",
  Rakuda: "earth",
  Ivory: "earth",
  "Grey/Silver": "metal",
  Gold: "metal",
  "Sumi Black": "water",
  "Dark Blue": "water",
  Sakura: "love"
};

function parseBirthDate(value) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

// 簡易ロジックです。厳密な四柱推命ではありません。
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

function getRecommendedColor(baseElement, selectedColor) {
  const pool = ELEMENT_TO_COLORS[baseElement] || ["Ivory"];

  if (!selectedColor) return pool[0];

  const selectedElement = COLOR_TO_ELEMENT[selectedColor];
  if (selectedElement === baseElement) return selectedColor;

  return pool[0];
}

function getTheme(baseElement, selectedColor) {
  const selectedElement = COLOR_TO_ELEMENT[selectedColor];

  if (!selectedColor || !selectedElement) {
    return "Balance";
  }

  if (selectedElement === baseElement) {
    return "Return to yourself";
  }

  const pairKey = `${selectedElement}->${baseElement}`;

  const map = {
    "fire->earth": "Calm the intensity",
    "fire->water": "Cool the excess",
    "fire->metal": "Sharpen your focus",
    "fire->wood": "Guide your momentum",

    "wood->earth": "Ground your growth",
    "wood->water": "Slow into depth",
    "wood->metal": "Choose with clarity",
    "wood->fire": "Move with courage",

    "earth->fire": "Wake up expression",
    "earth->water": "Rest more deeply",
    "earth->metal": "Refine your priorities",
    "earth->wood": "Allow renewal",

    "metal->earth": "Soften the pressure",
    "metal->water": "Make room to feel",
    "metal->wood": "Loosen the control",
    "metal->fire": "Bring back warmth",

    "water->earth": "Steady your feelings",
    "water->fire": "Bring hidden force forward",
    "water->metal": "Think with precision",
    "water->wood": "Turn inward growth outward",

    "love->earth": "Make softness stable",
    "love->metal": "Protect what matters",
    "love->water": "Let tenderness rest",
    "love->fire": "Express what you feel",
    "love->wood": "Grow from the heart"
  };

  return map[pairKey] || "Return to balance";
}

const SYSTEM_PROMPT = `
You create a refined, minimal color result.

This is inspired by Four Pillars thinking, but uses a simplified elemental balance model.
Do not claim certainty.
Do not sound mystical.
Do not explain the system.
Do not use words like destiny, aura, universe, vibration, healing, manifest, 100%.

You must output exactly in this format:

Color: [allowed color only]
Theme: [2 to 5 words]
Message: [1 short sentence only, max 14 words]

Tone:
- elegant
- sharp
- simple
- emotionally accurate
- expensive
- memorable

The color must remain exactly the recommended color provided.
`.trim();

app.post("/api/generate-reading", async (req, res) => {
  try {
    const { birthDate = "", selectedColor = "" } = req.body || {};

    const safeSelectedColor = ALLOWED_COLORS.includes(selectedColor) ? selectedColor : "";
    const baseElement = getBaseElementFromBirthDate(birthDate);
    const recommendedColor = getRecommendedColor(baseElement, safeSelectedColor);
    const theme = getTheme(baseElement, safeSelectedColor);

    const userPrompt = `
Allowed colors:
${ALLOWED_COLORS.join(", ")}

Birth date: ${birthDate || "Not provided"}
Chosen color now: ${safeSelectedColor || "Not provided"}
Recommended color: ${recommendedColor}
Theme: ${theme}

Write one unforgettable result.
Keep it very simple.
The Color must remain exactly "${recommendedColor}".
The Theme must remain exactly "${theme}".
`.trim();

    const response = await client.responses.create({
      model: "gpt-4o",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      max_output_tokens: 80
    });

    const text =
      response.output_text?.trim() ||
      `Color: ${recommendedColor}
Theme: ${theme}
Message: What you need now is less force and more quiet alignment.`;

    res.json({ text });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({
      text: `Color: Ivory
Theme: Return to balance
Message: Come back to what steadies you.`
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
