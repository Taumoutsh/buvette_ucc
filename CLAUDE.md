# Buvette UCC

Application web de prise de commandes pour buvette, optimisée pour smartphone.

## Stack technique

- **Backend** : Node.js + Express
- **Base de données** : SQLite via better-sqlite3
- **Authentification** : JWT (jsonwebtoken + bcrypt)
- **Frontend** : HTML/CSS/JS vanilla (pas de framework)
- **Déploiement** : Docker + docker-compose

## Structure du projet

```
server.js          # Point d'entrée Express
db.js              # Initialisation SQLite + seed du compte par défaut
middleware/auth.js  # Middleware JWT
routes/
  auth.js          # POST /api/auth/login, GET /api/auth/verify
  plates.js        # CRUD /api/plates
  menus.js         # CRUD /api/menus (avec association plats via menu_plates)
  orders.js        # CRUD /api/orders (avec order_items)
public/
  index.html       # Page principale (prise de commande)
  login.html       # Page de connexion
  history.html     # Historique des commandes
  options.html     # Gestion des plats et menus
  css/style.css    # Styles mobile-first
  js/
    app.js         # Logique de la page principale
    login.js       # Logique de connexion
    history.js     # Logique historique
    options.js     # Logique gestion plats/menus
```

## Commandes

```bash
npm install        # Installer les dépendances
npm run dev        # Lancer en mode développement (watch)
npm start          # Lancer en production
./deploy.sh        # Déployer avec Docker
```

## Base de données

SQLite stockée dans `data/buvette.db` (créée automatiquement au premier lancement).

Tables : `users`, `plates`, `menus`, `menu_plates`, `orders`, `order_items`.

Les plats et menus ont une catégorie (`food` ou `beverage`) et un flag `active` (soft delete).

## Compte par défaut

- Utilisateur : défini par `DEFAULT_USERNAME` dans `.env` (défaut : `buvette`)
- Mot de passe : défini par `DEFAULT_PASSWORD` dans `.env` (défaut : `ucc2024`)

## Variables d'environnement

Voir `.env.example`. Copier en `.env` et adapter :
- `PORT` : port du serveur (défaut 3000)
- `JWT_SECRET` : clé secrète pour les tokens JWT
- `DEFAULT_USERNAME` / `DEFAULT_PASSWORD` : compte par défaut

## Conventions

- Application entièrement en français (UI et messages d'erreur)
- Mobile-first : conçue pour être utilisée sur smartphone par des serveurs
- Les prix sont en euros, affichés avec virgule (ex: 2,50 €)
- Pas de framework frontend : vanilla JS avec fetch API
- Les onglets Nourriture/Boissons filtrent par catégorie, le choix est persisté dans localStorage
