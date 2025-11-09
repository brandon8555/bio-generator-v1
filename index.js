require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const { authMiddleware, register, login, getProfile } = require('./auth');
const { createCheckoutSession, handleWebhook, createPortalSession } = require('./stripe');
const { dbUtils } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use('/webhook', express.raw({ type: 'application/json' })); // Pour Stripe webhook
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite de 100 requêtes par IP
});
app.use('/api/', limiter);

// Routes d'authentification
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/profile', authMiddleware, getProfile);

// Routes Stripe
app.post('/api/stripe/create-checkout', authMiddleware, createCheckoutSession);
app.post('/api/stripe/create-portal', authMiddleware, createPortalSession);
app.post('/webhook', handleWebhook);

// Route principale : Générer une bio
app.post('/api/generate', authMiddleware, async (req, res) => {
  try {
    const { name, niche, style, platform } = req.body;

    if (!name || !niche) {
      return res.status(400).json({ error: 'Nom et niche requis' });
    }

    // Vérifier le statut de l'utilisateur
    const user = dbUtils.findUserById(req.userId);
    const isPremium = user.is_premium === 1;

    // Vérifier les limites pour les utilisateurs gratuits
    if (!isPremium) {
      const today = new Date().toISOString().split('T')[0];
      const dailyUsage = dbUtils.getDailyUsage(req.userId, today);
      const limit = parseInt(process.env.FREE_DAILY_LIMIT) || 3;

      if (dailyUsage >= limit) {
        return res.status(429).json({
          error: 'Limite quotidienne atteinte',
          message: 'Passez à Premium pour des générations illimitées !',
          needsUpgrade: true
        });
      }
    }

    // Générer la bio avec OpenAI
    const prompt = `Génère une bio ${style || 'créative'} pour ${platform || 'Instagram/TikTok'}.
Nom/Pseudo: ${name}
Niche/Thème: ${niche}

Règles:
- Maximum 150 caractères
- Utilise des emojis pertinents
- Sois accrocheur et unique
- Adapte le ton à la niche
- Ne mets pas de guillemets

Génère uniquement la bio, sans explication.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.9
    });

    const bioText = completion.choices[0].message.content.trim();

    // Sauvegarder la génération
    dbUtils.saveGeneration(req.userId, bioText, platform || 'instagram');

    // Incrémenter l'usage si utilisateur gratuit
    if (!isPremium) {
      const today = new Date().toISOString().split('T')[0];
      dbUtils.incrementDailyUsage(req.userId, today);
    }

    res.json({
      success: true,
      bio: bioText,
      isPremium
    });

  } catch (error) {
    console.error('Erreur génération:', error);
    res.status(500).json({ error: 'Erreur lors de la génération de la bio' });
  }
});

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});

module.exports = app;
