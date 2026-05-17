// Requiere: variable de entorno GEMINI_API_KEY en Vercel
// GET  /api/chat → diagnóstico
// POST /api/chat → chat con Gemini
const https = require('https');

const SYSTEM_PROMPT = 'Eres el asistente virtual de CSPI, una agencia de diseño web en Madrid. Responde SIEMPRE en español, de forma amigable y concisa. Máximo 3-4 frases por respuesta, sin listas largas. Servicios: diseño web a medida, gestión de redes sociales, SEO local. Precios: 499€ Básico (hasta 4 páginas), 899€ Profesional (hasta 8 páginas, el más elegido), 1.399€ Completo (páginas ilimitadas). Entrega en 7 días, precio fijo, revisiones ilimitadas, código 100% propiedad del cliente. Zona: Madrid capital y Comunidad de Madrid, también toda España online. Contacto: admin@cspiwebs.com. Si alguien quiere contratar o pedir presupuesto, invítalos al formulario de contacto de la web o a escribir a admin@cspiwebs.com.';

const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];

function httpsPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'generativelanguage.googleapis.com',
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch { reject(new Error(`Non-JSON (HTTP ${res.statusCode}): ${raw.slice(0, 300)}`)); }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function tryModel(apiKey, model, contents) {
  const { status, body } = await httpsPost(
    `/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { system_instruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents }
  );
  console.log(`[chat] model=${model} status=${status}`);
  if (body.error) {
    console.warn(`[chat] ${model} → ${body.error.code}: ${body.error.message}`);
    return { reply: null, error: `${body.error.code}: ${body.error.message}` };
  }
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { reply: null, error: 'empty candidates' };
  return { reply: text, error: null };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const apiKey = process.env.GEMINI_API_KEY;

  // GET: diagnóstico
  if (req.method === 'GET') {
    if (!apiKey) return res.status(200).json({ ok: false, reason: 'GEMINI_API_KEY not set' });
    const results = {};
    for (const m of MODELS) {
      const probe = await tryModel(apiKey, m, [{ role: 'user', parts: [{ text: 'di hola en una palabra' }] }]);
      results[m] = probe.reply ? 'OK: ' + probe.reply : 'FAIL: ' + probe.error;
      if (probe.reply) break;
    }
    return res.status(200).json({ results });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    const { messages } = req.body;
    const trimmed = (messages || []).slice(-10);

    let reply = null;
    let lastError = '';
    for (const model of MODELS) {
      const result = await tryModel(apiKey, model, trimmed);
      if (result.reply) { reply = result.reply; break; }
      lastError = result.error;
    }
    if (!reply) throw new Error('All models failed: ' + lastError);

    res.status(200).json({ reply });
  } catch (err) {
    console.error('[chat] error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
