/**
 * Mini Reading Generator — Backend
 *
 * Serves the static frontend and exposes one API route:
 *   POST /api/generate-reading
 *
 * The OpenAI key lives in OPENAI_API_KEY (environment variable).
 * It is NEVER sent to the browser.
 *
 * Start:
 *   OPENAI_API_KEY=sk-... node server.js
 *   — or —
 *   Copy .env.example → .env, fill in your key, then: node server.js
 */

'use strict';

// Load .env file if present (dev convenience — not needed in production)
try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }

const express = require('express');
const OpenAI  = require('openai');
const path    = require('path');

// ── Validate environment ──────────────────────────────────────────────────────
if (!process.env.OPENAI_API_KEY) {
  console.error('[error] OPENAI_API_KEY environment variable is not set.');
  console.error('        Copy .env.example → .env and add your key, then restart.');
  process.exit(1);
}

// ── OpenAI client ─────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '32kb' }));

// Serve the frontend from ./public/
app.use(express.static(path.join(__dirname, 'public')));

// ── POST /api/generate-reading ────────────────────────────────────────────────
app.post('/api/generate-reading', async (req, res) => {
  const { systemPrompt, userPrompt } = req.body ?? {};

  if (!systemPrompt || !userPrompt) {
    return res.status(400).json({ error: 'systemPrompt and userPrompt are required.' });
  }

  // Stream back as Server-Sent Events so the frontend can render word-by-word
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if present
  res.flushHeaders();

  try {
    const stream = await openai.chat.completions.create({
      model:      'gpt-4o',
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) {
        // Send each piece as an SSE "data" line
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('[openai error]', err?.message ?? err);
    // Try to send the error to the client before closing
    try {
      res.write(`data: ${JSON.stringify({ error: err?.message ?? 'Unknown error' })}\n\n`);
      res.end();
    } catch (_) {
      res.end();
    }
  }
});

// ── Catch-all: return index.html for any unknown route ─────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`[ready] Mini Reading Generator running → http://localhost:${PORT}`);
});
