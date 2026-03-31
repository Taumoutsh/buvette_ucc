#!/bin/bash
set -e

echo "=== Déploiement Buvette UCC ==="

# Check if .env exists
if [ ! -f .env ]; then
  echo "Création du fichier .env depuis .env.example..."
  cp .env.example .env
  echo "IMPORTANT : Modifiez le fichier .env avec vos propres valeurs !"
  echo "  - JWT_SECRET : changez pour une clé aléatoire"
  echo "  - DEFAULT_PASSWORD : changez le mot de passe par défaut"
  exit 1
fi

# Build and start
echo "Construction et démarrage des conteneurs..."
docker compose up -d --build

echo ""
echo "Buvette UCC est démarré !"
echo "Accédez à l'application : http://localhost:${PORT:-3000}"
echo ""
echo "Commandes utiles :"
echo "  docker compose logs -f     # Voir les logs"
echo "  docker compose down        # Arrêter"
echo "  docker compose restart     # Redémarrer"
