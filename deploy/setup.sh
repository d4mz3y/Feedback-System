#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu instance to host Feedback-System publicly.
# Run as a sudo-capable user. Review before running.
set -euo pipefail

DOMAIN="${1:-feedback.hoganguards.com}"
REPO_URL="git@github.com:d4mz3y/Feedback-System.git"
APP_DIR="$HOME/Feedback-System"

echo "==> Installing Docker"
if ! command -v docker >/dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    echo "Log out and back in for the docker group to take effect, then re-run this script."
    exit 0
fi

echo "==> Installing nginx and certbot"
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

echo "==> Cloning app"
if [ ! -d "$APP_DIR" ]; then
    git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

if [ ! -f .env ]; then
    echo "==> No .env found. Copy .env.example to .env and fill in real credentials before continuing:"
    echo "    cp .env.example .env && nano .env"
    exit 1
fi

echo "==> Building and starting the app container (bound to 127.0.0.1:3001)"
docker compose up -d --build

echo "==> Installing nginx site config for $DOMAIN"
sudo sed "s/feedback.hoganguards.com/$DOMAIN/g" deploy/nginx-feedback.conf | sudo tee "/etc/nginx/sites-available/$DOMAIN" > /dev/null
sudo ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Requesting a TLS certificate for $DOMAIN"
echo "    (make sure DNS for $DOMAIN already points at this instance's public IP first)"
sudo certbot --nginx -d "$DOMAIN"

echo "==> Done. https://$DOMAIN should now be live."
