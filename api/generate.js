const OpenAI = require('openai');
const jwt = require('jsonwebtoken');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const JWT_SECRET = process.env.JWT_SECRET || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6';

global.db = global.db || { users: [], generations: [], daily_usage: [] };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, niche, style, platform } = req.body;
    
    if (!name || !niche) {
      return res.status(400).json({ error: 'Nom et niche requis' });
    }
    
    const user = global.db.users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const isPremium = user.is_premium === 1;
    
    if (!isPremium) {
      const today = new Date().toISOString().split('T')[0];
      const usage = global.db.daily_usage.find(u => u.user_id === decoded.userId && u.date === today);
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
    
    global.db.generations.push({
      id: global.db.generations.length + 1,
      user_id: decoded.userId,
      bio_text: bioText,
      platform: platform || 'instagram',
      created_at: new Date().toISOString()
    });
    
    if (!isPremium) {
      const today = new Date().toISOString().split('T')[0];
      const usage = global.db.daily_usage.find(u => u.user_id === decoded.userId && u.date === today);
      if (usage) {
        usage.count++;
      } else {
        global.db.daily_usage.push({ 
          id: global.db.daily_usage.length + 1, 
          user_id: decoded.userId, 
          date: today, 
          count: 1 
        });
      }
    }
    
    return res.json({ success: true, bio: bioText, isPremium });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
};
