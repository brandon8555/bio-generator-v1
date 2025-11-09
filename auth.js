const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { dbUtils } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_changez_moi';

// Middleware d'authentification
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// Inscription
const register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = dbUtils.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const result = dbUtils.createUser(email, hashedPassword);
    const userId = result.lastInsertRowid;

    // Générer le token JWT
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        isPremium: false
      }
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
};

// Connexion
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    // Trouver l'utilisateur
    const user = dbUtils.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Générer le token JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        isPremium: user.is_premium === 1
      }
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
};

// Obtenir le profil utilisateur
const getProfile = (req, res) => {
  try {
    const user = dbUtils.findUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const stats = dbUtils.getUserStats(req.userId);
    const today = new Date().toISOString().split('T')[0];
    const dailyUsage = dbUtils.getDailyUsage(req.userId, today);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        isPremium: user.is_premium === 1,
        totalGenerations: stats.total,
        dailyUsage
      }
    });
  } catch (error) {
    console.error('Erreur profil:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
};

module.exports = {
  authMiddleware,
  register,
  login,
  getProfile
};
