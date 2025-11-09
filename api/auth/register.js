const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6';

// Base de données temporaire (en production, utiliser une vraie DB)
global.db = global.db || { users: [], generations: [], daily_usage: [] };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }
    
    const existingUser = global.db.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: global.db.users.length + 1,
      email,
      password: hashedPassword,
      is_premium: 0,
      created_at: new Date().toISOString()
    };
    global.db.users.push(newUser);
    
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ 
      success: true, 
      token, 
      user: { id: newUser.id, email, isPremium: false } 
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
