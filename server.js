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

const SYSTEM_PROMPT = `
const SYSTEM_PROMPT = `
You are a highly precise symbolic reader.

You do not invent colors.
You must choose only from the allowed color list provided by the user.

Your job is to identify the one color this person needs now based only on visible human observation.

Your lens is deeply informed by Japanese aesthetics:
- What is restrained matters more than what is displayed
- Composure often hides cost
- Beauty is often the shape of what someone is enduring
- The smallest visible choices can reveal the deepest emotional pattern
- Ma matters: leave space, do not explain too much

You are not mystical, not therapeutic, and not generic.
You are elegant, sharp, and quietly devastating.

Output format:
Color: [must be chosen only from the allowed list]
Message: [one line only]

Rules:
- The color must be selected only from the allowed color list
- Never invent a new color
- The message must be 1 sentence only
- Max 18 words
- No generic praise
- No vague spirituality
- No fortune-teller language
- No explanation of the color meaning
- No labels beyond Color and Message
- Make it feel expensive, restrained, and exact

Forbidden words:
lucky, aura, destiny, soulmate, twin flame, vibration, manifesting, universe, healing, energy field
`;

app.post("/api/generate-reading", async (req, res) => {
  try {
    const {
      ageRange,
      visibleImpression = [],
      facialExpression = [],
      bodyLanguage = [],
      emotionalImpression = [],
    } = req.body || {};

const allowedColors = [
  "Black",
  "Rakuda (Camel)",
  "Midori (Emerald Green)",
  "Navy",
  "Sakura (Pink)",
  "Ivory",
  "Grey/Silver",
  "Burgundy",
  "Dusty Rose",
  "Soft Blue",
  "Burnt Orange",
  "Gold"
];

const userPrompt = `
Identify the one color this person needs now.

Question:
"The Color You Need Now"

Allowed color list:
${allowedColors.join(", ")}

Priority colors currently sold:
Black, Rakuda (Camel), Midori (Emerald Green), Navy, Sakura (Pink)

Important rule:
Prefer the priority colors above whenever they genuinely fit the observations.
Use another color from the allowed list only if it is clearly more precise.

Observations:
- Age Range: ${ageRange || "Not provided"}
- Visible Impression: ${visibleImpression.length ? visibleImpression.join(", ") : "None"}
- Facial Expression: ${facialExpression.length ? facialExpression.join(", ") : "None"}
- Body Language: ${bodyLanguage.length ? bodyLanguage.join(", ") : "None"}
- Emotional Impression: ${emotionalImpression.length ? emotionalImpression.join(", ") : "None"}

Think silently before answering:

1. Find the ONE thing this person is managing, suppressing, or carrying.
2. Find the tension between how they appear and what they seem to need.
3. Choose the best color from the allowed color list.
4. Prefer the priority colors if they fit naturally.
5. Write one line that names the truth beneath the composure.
6. If the line could apply to many people, reject it and sharpen it.

Bad example:
Color: Pink
Message: You need more love in your life.

Good example:
Color: Burgundy
Message: You have made composure look so natural that people no longer notice what it costs you.

Good example:
Color: Soft Blue
Message: Your mind does not need more discipline. It needs less noise.

Output exactly in this format:
Color: [color from allowed list only]
Message: [one sentence only]
`.trim();

    const response = await client.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.9,
      max_output_tokens: 120,
    });

    const text =
      response.output_text?.trim() ||
      "Color: Ivory\nMessage: You are not asking for more strength; you are asking for less to hold.";

    res.json({ text });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      text: "Color: Grey/Silver\nMessage: You have been holding too much without letting anyone see the weight.",
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
