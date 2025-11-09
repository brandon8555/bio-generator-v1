// Fichier API pour Vercel Serverless
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Base de données en mémoire (temporaire)
let db = {
  users: [],
  generations: [],
  daily_usage: []
};

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_changez_moi';

// Middleware d'authentification
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// Routes d'authentification
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  if (password.length < 6) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  
  const existingUser = db.users.find(u => u.email === email);
  if (existingUser) return res.status(400).json({ error: 'Cet email est déjà utilisé' });
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: db.users.length + 1,
    email,
    password: hashedPassword,
    is_premium: 0,
    created_at: new Date().toISOString()
  };
  db.users.push(newUser);
  
  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ success: true, token, user: { id: newUser.id, email, isPremium: false } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  
  const user = db.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ success: true, token, user: { id: user.id, email: user.email, isPremium: user.is_premium === 1 } });
});

app.get('/api/auth/profile', authMiddleware, (req, res) => {
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  
  const today = new Date().toISOString().split('T')[0];
  const usage = db.daily_usage.find(u => u.user_id === req.userId && u.date === today);
  const dailyUsage = usage ? usage.count : 0;
  const total = db.generations.filter(g => g.user_id === req.userId).length;
  
  res.json({
    user: {
      id: user.id,
      email: user.email,
      isPremium: user.is_premium === 1,
      totalGenerations: total,
      dailyUsage
    }
  });
});

// Route de génération
app.post('/api/generate', authMiddleware, async (req, res) => {
  try {
    const { name, niche, style, platform } = req.body;
    if (!name || !niche) return res.status(400).json({ error: 'Nom et niche requis' });
    
    const user = db.users.find(u => u.id === req.userId);
    const isPremium = user.is_premium === 1;
    
    if (!isPremium) {
      const today = new Date().toISOString().split('T')[0];
      const usage = db.daily_usage.find(u => u.user_id === req.userId && u.date === today);
      const dailyUsage = usage ? usage.count : 0;
      const limit = parseInt(process.env.FREE_DAILY_LIMIT) || 3;
      
      if (dailyUsage >= limit) {
        return res.status(429).json({
          error: 'Limite quotidienne atteinte',
          message: 'Passez à Premium pour des générations illimitées !',
          needsUpgrade: true
        });
      }
    }
    
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
    
    db.generations.push({
      id: db.generations.length + 1,
      user_id: req.userId,
      bio_text: bioText,
      platform: platform || 'instagram',
      created_at: new Date().toISOString()
    });
    
    if (!isPremium) {
      const today = new Date().toISOString().split('T')[0];
      const usage = db.daily_usage.find(u => u.user_id === req.userId && u.date === today);
      if (usage) {
        usage.count++;
      } else {
        db.daily_usage.push({ id: db.daily_usage.length + 1, user_id: req.userId, date: today, count: 1 });
      }
    }
    
    res.json({ success: true, bio: bioText, isPremium });
  } catch (error) {
    console.error('Erreur génération:', error);
    res.status(500).json({ error: 'Erreur lors de la génération de la bio' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;
