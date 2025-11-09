// API Vercel Serverless (sans Express)
const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const JWT_SECRET = process.env.JWT_SECRET || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6';

// Base de données en mémoire
let db = {
  users: [],
  generations: [],
  daily_usage: []
};

// Helper pour CORS
const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// Handler principal
module.exports = async (req, res) => {
  setCors(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;
  
  try {
    // Route: Register
    if (url.includes('/api/auth/register') && method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      }
      
      const existingUser = db.users.find(u => u.email === email);
      if (existingUser) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
      
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
      return res.json({ success: true, token, user: { id: newUser.id, email, isPremium: false } });
    }
    
    // Route: Login
    if (url.includes('/api/auth/login') && method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }
      
      const user = db.users.find(u => u.email === email);
      if (!user) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }
      
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ success: true, token, user: { id: user.id, email: user.email, isPremium: user.is_premium === 1 } });
    }
    
    // Route: Profile
    if (url.includes('/api/auth/profile') && method === 'GET') {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.users.find(u => u.id === decoded.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
      
      const today = new Date().toISOString().split('T')[0];
      const usage = db.daily_usage.find(u => u.user_id === decoded.userId && u.date === today);
      const dailyUsage = usage ? usage.count : 0;
      const total = db.generations.filter(g => g.user_id === decoded.userId).length;
      
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          isPremium: user.is_premium === 1,
          totalGenerations: total,
          dailyUsage
        }
      });
    }
    
    // Route: Generate
    if (url.includes('/api/generate') && method === 'POST') {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      const { name, niche, style, platform } = req.body;
      
      if (!name || !niche) {
        return res.status(400).json({ error: 'Nom et niche requis' });
      }
      
      const user = db.users.find(u => u.id === decoded.userId);
      const isPremium = user.is_premium === 1;
      
      if (!isPremium) {
        const today = new Date().toISOString().split('T')[0];
        const usage = db.daily_usage.find(u => u.user_id === decoded.userId && u.date === today);
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
        user_id: decoded.userId,
        bio_text: bioText,
        platform: platform || 'instagram',
        created_at: new Date().toISOString()
      });
      
      if (!isPremium) {
        const today = new Date().toISOString().split('T')[0];
        const usage = db.daily_usage.find(u => u.user_id === decoded.userId && u.date === today);
        if (usage) {
          usage.count++;
        } else {
          db.daily_usage.push({ 
            id: db.daily_usage.length + 1, 
            user_id: decoded.userId, 
            date: today, 
            count: 1 
          });
        }
      }
      
      return res.json({ success: true, bio: bioText, isPremium });
    }
    
    // Route: Health
    if (url.includes('/api/health')) {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    
    // Route non trouvée
    return res.status(404).json({ error: 'Route non trouvée' });
    
  } catch (error) {
    console.error('Erreur API:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
};
