// Configuration
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : '/api';

// État de l'application
let currentUser = null;
let selectedPlatform = 'instagram';
let authMode = 'login';

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupEventListeners();
});

// Configuration des écouteurs d'événements
function setupEventListeners() {
  // Platform buttons
  document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPlatform = btn.dataset.platform;
    });
  });

  // Generator form
  document.getElementById('generatorForm').addEventListener('submit', handleGenerate);
  
  // Auth form
  document.getElementById('authForm').addEventListener('submit', handleAuth);
}

// Vérifier l'authentification
function checkAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    fetchProfile(token);
  }
}

// Récupérer le profil utilisateur
async function fetchProfile(token) {
  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      updateUI();
    } else {
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.error('Erreur profil:', error);
  }
}

// Mettre à jour l'interface utilisateur
function updateUI() {
  if (currentUser) {
    document.getElementById('authButtons').classList.add('hidden');
    document.getElementById('userMenu').classList.remove('hidden');
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('usageCounter').classList.remove('hidden');
    
    if (currentUser.isPremium) {
      document.getElementById('premiumBadge').classList.remove('hidden');
      document.getElementById('usageLimit').classList.add('hidden');
    } else {
      document.getElementById('usageCount').textContent = currentUser.dailyUsage || 0;
    }
  } else {
    document.getElementById('authButtons').classList.remove('hidden');
    document.getElementById('userMenu').classList.add('hidden');
    document.getElementById('usageCounter').classList.add('hidden');
  }
}

// Gérer la génération de bio
async function handleGenerate(e) {
  e.preventDefault();

  if (!currentUser) {
    showToast('Connecte-toi pour générer une bio !');
    showAuthModal('login');
    return;
  }

  const name = document.getElementById('name').value;
  const niche = document.getElementById('niche').value;
  const style = document.getElementById('style').value;

  const btn = document.getElementById('generateBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner loading"></i> Génération en cours...';
  btn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name,
        niche,
        style,
        platform: selectedPlatform
      })
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById('generatedBio').textContent = data.bio;
      document.getElementById('resultSection').classList.remove('hidden');
      document.getElementById('upgradeCTA').classList.add('hidden');
      
      // Mettre à jour le compteur
      if (!data.isPremium) {
        const currentCount = parseInt(document.getElementById('usageCount').textContent);
        document.getElementById('usageCount').textContent = currentCount + 1;
      }
      
      showToast('Bio générée avec succès ! ✨');
    } else if (data.needsUpgrade) {
      document.getElementById('upgradeCTA').classList.remove('hidden');
      showToast(data.message);
    } else {
      showToast(data.error || 'Erreur lors de la génération');
    }
  } catch (error) {
    console.error('Erreur:', error);
    showToast('Erreur de connexion au serveur');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// Copier la bio
function copyBio() {
  const bioText = document.getElementById('generatedBio').textContent;
  navigator.clipboard.writeText(bioText).then(() => {
    showToast('Bio copiée ! 📋');
  });
}

// Générer une autre version
function generateAnother() {
  document.getElementById('resultSection').classList.add('hidden');
  document.getElementById('generatorForm').scrollIntoView({ behavior: 'smooth' });
}

// Passer à Premium
async function upgradeToPremium() {
  if (!currentUser) {
    showAuthModal('login');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/stripe/create-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (error) {
    console.error('Erreur Stripe:', error);
    showToast('Erreur lors de la création de la session de paiement');
  }
}

// Gérer l'authentification
async function handleAuth(e) {
  e.preventDefault();

  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const endpoint = authMode === 'login' ? 'login' : 'register';

  try {
    const response = await fetch(`${API_URL}/auth/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.token);
      currentUser = data.user;
      updateUI();
      closeAuthModal();
      showToast(authMode === 'login' ? 'Connexion réussie !' : 'Compte créé avec succès !');
    } else {
      showToast(data.error || 'Erreur d\'authentification');
    }
  } catch (error) {
    console.error('Erreur auth:', error);
    showToast('Erreur de connexion au serveur');
  }
}

// Afficher le modal d'authentification
function showAuthModal(mode) {
  authMode = mode;
  document.getElementById('authModal').classList.remove('hidden');
  
  if (mode === 'login') {
    document.getElementById('modalTitle').textContent = 'Connexion';
    document.getElementById('authSubmitText').textContent = 'Se connecter';
    document.getElementById('authSwitchText').textContent = 'Pas encore de compte ?';
    document.getElementById('authSwitchBtn').textContent = 'S\'inscrire';
  } else {
    document.getElementById('modalTitle').textContent = 'Inscription';
    document.getElementById('authSubmitText').textContent = 'Créer mon compte';
    document.getElementById('authSwitchText').textContent = 'Déjà un compte ?';
    document.getElementById('authSwitchBtn').textContent = 'Se connecter';
  }
  
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
}

// Fermer le modal
function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

// Basculer entre connexion et inscription
function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  showAuthModal(authMode);
}

// Déconnexion
function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  updateUI();
  document.getElementById('resultSection').classList.add('hidden');
  document.getElementById('upgradeCTA').classList.add('hidden');
  showToast('Déconnexion réussie');
}

// Afficher un toast
function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Vérifier les paramètres URL (succès Stripe)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('success') === 'true') {
  showToast('Abonnement activé ! Bienvenue en Premium 🎉');
  window.history.replaceState({}, document.title, window.location.pathname);
  setTimeout(() => location.reload(), 2000);
}
