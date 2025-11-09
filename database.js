const fs = require('fs');
const path = require('path');

// Fichier de base de données JSON
const DB_FILE = path.join(__dirname, '..', 'database.json');

// Initialiser la base de données
let db = {
  users: [],
  generations: [],
  daily_usage: []
};

// Charger la base de données si elle existe
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (error) {
    console.error('Erreur chargement DB:', error);
  }
}

// Sauvegarder la base de données
function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Fonctions utilitaires pour la base de données
const dbUtils = {
  // Créer un utilisateur
  createUser: (email, hashedPassword) => {
    const newUser = {
      id: db.users.length + 1,
      email,
      password: hashedPassword,
      is_premium: 0,
      stripe_customer_id: null,
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDB();
    return { lastInsertRowid: newUser.id };
  },

  // Trouver un utilisateur par email
  findUserByEmail: (email) => {
    return db.users.find(u => u.email === email);
  },

  // Trouver un utilisateur par ID
  findUserById: (id) => {
    return db.users.find(u => u.id === id);
  },

  // Mettre à jour le statut premium
  updatePremiumStatus: (userId, isPremium, stripeCustomerId = null) => {
    const user = db.users.find(u => u.id === userId);
    if (user) {
      user.is_premium = isPremium;
      if (stripeCustomerId) user.stripe_customer_id = stripeCustomerId;
      saveDB();
    }
  },

  // Sauvegarder une génération
  saveGeneration: (userId, bioText, platform) => {
    db.generations.push({
      id: db.generations.length + 1,
      user_id: userId,
      bio_text: bioText,
      platform,
      created_at: new Date().toISOString()
    });
    saveDB();
  },

  // Obtenir l'usage quotidien
  getDailyUsage: (userId, date) => {
    const usage = db.daily_usage.find(u => u.user_id === userId && u.date === date);
    return usage ? usage.count : 0;
  },

  // Incrémenter l'usage quotidien
  incrementDailyUsage: (userId, date) => {
    const usage = db.daily_usage.find(u => u.user_id === userId && u.date === date);
    if (usage) {
      usage.count++;
    } else {
      db.daily_usage.push({
        id: db.daily_usage.length + 1,
        user_id: userId,
        date,
        count: 1
      });
    }
    saveDB();
  },

  // Obtenir les statistiques utilisateur
  getUserStats: (userId) => {
    const total = db.generations.filter(g => g.user_id === userId).length;
    return { total };
  }
};

module.exports = { dbUtils };
