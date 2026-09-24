#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu instance to host Feedback-System publicly.
# Run as a sudo-capable user. Review before running.
set -euo pipefail

DOMAIN="${1:-}"
ZEROTIER_NETWORK_ID="${2:-}"
REPO_URL="https://github.com/d4mz3y/Feedback-System.git"
APP_DIR="$HOME/Feedback-System"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain> [zerotier-network-id]"
    echo "  e.g.: $0 192.0.2.10.nip.io <NETWORK_ID>"
    exit 1
fi

echo "==> Installing ZeroTier (for admin SSH access — no public port 22 on this box)"
if ! command -v zerotier-cli >/dev/null; then
    curl -s https://install.zerotier.com | sudo bash
fi
if [ -n "$ZEROTIER_NETWORK_ID" ]; then
    sudo zerotier-cli join "$ZEROTIER_NETWORK_ID"
    echo "Joined $ZEROTIER_NETWORK_ID — approve this device in ZeroTier Central, same as hg-attendance-prod was."
else
    echo "No ZeroTier network ID passed as the 2nd argument — join manually:"
    echo "    sudo zerotier-cli join <NETWORK_ID>"
fi

echo "==> Opening 80/443 in the host firewall (NSG allows them, but Ubuntu's own firewall blocks by default)"
if command -v ufw >/dev/null && sudo ufw status | grep -q "Status: active"; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
else
    sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
    sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
    sudo netfilter-persistent save 2>/dev/null || sudo sh -c 'iptables-save > /etc/iptables/rules.v4' 2>/dev/null || true
fi

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
CERT_EMAIL=$(grep '^EMAIL_USER=' .env | cut -d= -f2-)
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect -m "$CERT_EMAIL"

echo "==> Done. https://$DOMAIN should now be live."
