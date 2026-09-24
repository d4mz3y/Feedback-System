# Deploying Feedback-System publicly on Oracle Cloud

This is deployed as a **separate instance** from the HG-Attendance system, in a public
subnet, so the attendance box's network stays exactly as locked-down as it is today.

## 1. Prerequisites (OCI Console — do this first)

1. Create a new Always Free instance in a **public subnet** of the VCN, with a public
   IPv4 address assigned.
2. Open **22** (to your IP only), **80** and **443** (to `0.0.0.0/0`) in that subnet's
   Security List or a dedicated NSG.
3. Point a DNS A record (e.g. `feedback.hoganguards.com`) at the instance's public IP.
4. Add your SSH key to the instance (cloud-init `ssh_authorized_keys`, or via console).

## 2. Server setup

SSH into the new instance, then:

```bash
git clone git@github.com:d4mz3y/Feedback-System.git
cd Feedback-System
cp .env.example .env
nano .env   # fill in real EMAIL_USER, EMAIL_PASS, RECIPIENT_EMAILS, MONGODB_URI
./deploy/setup.sh feedback.hoganguards.com
```

The script installs Docker, nginx and certbot, builds and starts the app container
(bound to `127.0.0.1:3001` only — never exposed directly), configures nginx as a
reverse proxy, and obtains a Let's Encrypt certificate for the domain.

## 3. Verify

```bash
curl -I https://feedback.hoganguards.com
```

Submit a test entry through the form and confirm the notification email arrives.

## 4. Redeploying after code changes

```bash
cd ~/Feedback-System
git pull
docker compose up -d --build
```

## Notes

- The app container only listens on `127.0.0.1:3001` on the host — nginx is the only
  thing exposed to the internet, terminating TLS and reverse-proxying to the app.
- `.env` is never committed — it's created directly on the server from `.env.example`.
- Rate limiting (5 submissions/IP/15min) is enforced in the app itself, no extra
  nginx config needed for that.
