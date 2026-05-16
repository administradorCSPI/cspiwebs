const SYSTEM_PROMPT = 'Eres el asistente virtual de CSPI, una agencia de diseño web en Madrid. Responde SIEMPRE en español, de forma amigable y concisa. Máximo 3-4 frases por respuesta, sin listas largas. Servicios: diseño web a medida, gestión de redes sociales, SEO local. Precios: 499€ Básico (hasta 4 páginas), 899€ Profesional (hasta 8 páginas, el más elegido), 1.399€ Completo (páginas ilimitadas). Entrega en 7 días, precio fijo, revisiones ilimitadas, código 100% propiedad del cliente. Zona: Madrid capital y Comunidad de Madrid, también toda España online. Contacto: admin@cspiwebs.com. Si alguien quiere contratar o pedir presupuesto, invítalos al formulario de contacto de la web o a escribir a admin@cspiwebs.com.';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { messages } = JSON.parse(event.body);
    const trimmed = messages.slice(-10);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: trimmed
        })
      }
    );
    const data = await response.json();
    const reply = data.candidates[0].content.parts[0].text;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };
  } catch {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno' })
    };
  }
};
