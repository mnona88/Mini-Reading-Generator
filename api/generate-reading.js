// api/generate-reading.js
// Vercel Node.js serverless function.
// CommonJS (no ESM) for maximum compatibility.
// OPENAI_API_KEY must be set in Vercel → Project → Settings → Environment Variables.

const OpenAI = require('openai');

module.exports = async function handler(req, res) {
  // Only POST is allowed
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { systemPrompt, userPrompt } = req.body ?? {};

  if (!systemPrompt || !userPrompt) {
    return res.status(400).json({ error: 'systemPrompt and userPrompt are required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
  }

  try {
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model:      'gpt-4o',
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? '';
    return res.status(200).json({ text });

  } catch (err) {
    console.error('[openai error]', err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? 'Unknown error' });
  }
};
