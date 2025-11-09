# 💰 BioGen AI - Générateur de Bio Instagram/TikTok

Application web complète de génération de bios pour réseaux sociaux avec IA, système d'abonnement et monétisation intégrée.

## 🎯 Modèle économique

- **Freemium** : 3 générations gratuites par jour
- **Premium** : 4,99€/mois pour générations illimitées
- **Publicités** : Google AdSense (à ajouter)
- **Affiliation** : Liens vers outils de croissance

**Potentiel de revenu** : 50-200€/jour avec 1000-2000 visiteurs

## 🚀 Installation rapide

### 1. Cloner et installer

```bash
npm install
```

### 2. Configuration des variables d'environnement

Copier `.env.example` vers `.env` et remplir :

```bash
cp .env.example .env
```

**Variables requises :**

- `JWT_SECRET` : Générer avec `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `OPENAI_API_KEY` : Obtenir sur https://platform.openai.com/api-keys
- `STRIPE_SECRET_KEY` : Obtenir sur https://dashboard.stripe.com/apikeys
- `STRIPE_PUBLISHABLE_KEY` : Clé publique Stripe
- `STRIPE_WEBHOOK_SECRET` : Configurer après déploiement

### 3. Lancer en local

```bash
npm start
```

Ouvrir http://localhost:3000

## 📦 Déploiement sur Vercel

### Méthode 1 : Via CLI

```bash
npm install -g vercel
vercel login
vercel
```

### Méthode 2 : Via GitHub

1. Push le code sur GitHub
2. Connecter le repo sur https://vercel.com
3. Ajouter les variables d'environnement dans Vercel Dashboard
4. Déployer automatiquement

### Configuration Stripe Webhook

Après déploiement :

1. Aller sur https://dashboard.stripe.com/webhooks
2. Créer un endpoint : `https://votre-domaine.vercel.app/webhook`
3. Sélectionner les événements :
   - `checkout.session.completed`
   - `customer.subscription.deleted`
4. Copier le secret webhook dans `STRIPE_WEBHOOK_SECRET`

## 🔑 Obtenir les clés API

### OpenAI (OBLIGATOIRE)

1. Créer un compte sur https://platform.openai.com
2. Aller dans API Keys
3. Créer une nouvelle clé
4. Ajouter 5-10€ de crédit minimum
5. Coût : ~0,002€ par génération

### Stripe (pour les paiements)

1. Créer un compte sur https://stripe.com
2. Mode Test pour développement
3. Mode Live pour production
4. Configurer le produit "Abonnement Premium" à 4,99€/mois
5. Copier le `price_id` dans `.env`

## 💡 Fonctionnalités

✅ Génération de bios avec GPT-3.5  
✅ Authentification JWT  
✅ Système de crédits quotidiens  
✅ Abonnement Stripe  
✅ Base de données SQLite  
✅ Interface responsive  
✅ Rate limiting  
✅ Sécurité (bcrypt, validation)

## 📊 Monétisation

### Phase 1 : Lancement (Mois 1-2)
- Trafic organique (SEO, réseaux sociaux)
- 100-500 visiteurs/jour
- Objectif : 10-30€/jour

### Phase 2 : Croissance (Mois 3-6)
- Publicité Google Ads
- Affiliation
- 500-2000 visiteurs/jour
- Objectif : 50-150€/jour

### Phase 3 : Scale (Mois 6+)
- Partenariats influenceurs
- SEO avancé
- 2000+ visiteurs/jour
- Objectif : 200-500€/jour

## 🎨 Personnalisation

### Ajouter Google AdSense

Dans `public/index.html`, ajouter avant `</head>` :

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-VOTRE-ID"
     crossorigin="anonymous"></script>
```

### Modifier le prix Premium

1. Changer dans `server/stripe.js` : `unit_amount: 499` (en centimes)
2. Mettre à jour le texte dans `public/index.html`

### Ajouter des plateformes

Dans `public/index.html`, ajouter un bouton :

```html
<button type="button" class="platform-btn" data-platform="youtube">
  <i class="fab fa-youtube"></i> YouTube
</button>
```

## 🔧 Structure du projet

```
bio-generator/
├── public/              # Frontend
│   ├── index.html      # Interface principale
│   ├── app.js          # Logique JavaScript
│   └── styles.css      # Styles personnalisés
├── server/             # Backend
│   ├── index.js        # Serveur Express
│   ├── auth.js         # Authentification
│   ├── stripe.js       # Paiements
│   └── database.js     # Base de données
├── database.db         # SQLite (créé automatiquement)
├── package.json        # Dépendances
├── vercel.json         # Config Vercel
└── .env               # Variables d'environnement
```

## 📈 Améliorer les revenus

### Court terme
- Ajouter Google AdSense
- Créer des templates premium exclusifs
- Offrir un plan annuel (49€/an = 2 mois gratuits)
- Programme de parrainage (1 mois gratuit)

### Moyen terme
- API payante pour développeurs
- Génération en masse (CSV)
- Analyse de performance des bios
- A/B testing de bios

### Long terme
- Application mobile
- Extension Chrome
- Marketplace de templates
- Service d'agence (gestion complète)

## 🛡️ Sécurité

- ✅ Mots de passe hashés (bcrypt)
- ✅ JWT pour l'authentification
- ✅ Rate limiting (100 req/15min)
- ✅ Validation des inputs
- ✅ CORS configuré
- ✅ Variables d'environnement

## 📞 Support

Pour toute question :
- Vérifier que toutes les variables `.env` sont configurées
- Vérifier que OpenAI a du crédit
- Consulter les logs : `vercel logs`

## 📝 Licence

MIT - Libre d'utilisation commerciale

---

**Prêt à générer des revenus ? Lance l'app et commence à monétiser ! 🚀**
