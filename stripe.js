const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { dbUtils } = require('./database');

// Créer une session de paiement Stripe
const createCheckoutSession = async (req, res) => {
  try {
    const user = dbUtils.findUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Créer ou récupérer le client Stripe
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id.toString() }
      });
      customerId = customer.id;
      dbUtils.updatePremiumStatus(user.id, 0, customerId);
    }

    // Créer la session de paiement
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Abonnement Premium',
              description: 'Générations illimitées + templates exclusifs'
            },
            unit_amount: 499, // 4,99€
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'http://localhost:3000'}?success=true`,
      cancel_url: `${req.headers.origin || 'http://localhost:3000'}?canceled=true`,
      metadata: {
        userId: user.id.toString()
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Erreur Stripe:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la session de paiement' });
  }
};

// Webhook Stripe pour gérer les événements
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Erreur webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gérer les événements
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const userId = parseInt(session.metadata.userId);
      dbUtils.updatePremiumStatus(userId, 1, session.customer);
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);
      const userIdToDowngrade = parseInt(customer.metadata.userId);
      dbUtils.updatePremiumStatus(userIdToDowngrade, 0);
      break;
  }

  res.json({ received: true });
};

// Créer un portail client Stripe
const createPortalSession = async (req, res) => {
  try {
    const user = dbUtils.findUserById(req.userId);
    if (!user || !user.stripe_customer_id) {
      return res.status(404).json({ error: 'Aucun abonnement trouvé' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: req.headers.origin || 'http://localhost:3000'
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Erreur portail:', error);
    res.status(500).json({ error: 'Erreur lors de la création du portail' });
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  createPortalSession
};
