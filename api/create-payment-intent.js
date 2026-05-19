const Stripe = require('stripe');

const VALID_AMOUNTS = new Set([49900, 89900, 139900]);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://cspiwebs.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const amount = Number(req.body?.amount);

  if (!VALID_AMOUNTS.has(amount)) {
    return res.status(400).json({ error: 'Importe no válido' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
    });
    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el pago' });
  }
};
