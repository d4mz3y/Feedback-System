# Deploying Feedback-System publicly on Oracle Cloud

This is deployed as a **separate instance** from the HG-Attendance system — its own
NSG, its own SSH key, no shared blast radius — even though it shares the same VCN and
public subnet.

## 1. Prerequisites (OCI Console — do this first)

1. Create a dedicated Network Security Group (e.g. `feedback-system-nsg`) **before**
   creating the instance, with:
   - TCP 80 from `0.0.0.0/0`
   - TCP 443 from `0.0.0.0/0`
   - UDP 9993 from `0.0.0.0/0` (ZeroTier)
   - **No port 22 rule.** Admin access goes over ZeroTier only, same as
     `hg-attendance-prod` — no public SSH surface, and no risk of losing access when a
     home/mobile IP rotates.
2. Create a new Always Free instance in the existing public subnet, attaching
   `feedback-system-nsg` at creation time, with a public IPv4 address assigned.
3. Point a DNS A record (e.g. `feedback.hoganguards.com`) at the instance's public IP.
4. Add your SSH key to the instance (cloud-init `ssh_authorized_keys`, or via console).

### First login (before ZeroTier is joined)

With no port 22 rule, there's no way in over the internet yet. Either:
- Use OCI's **Console Connection** (serial console, browser-based, no network exposure), or
- Temporarily add a port 22 rule scoped to your current IP, do the initial setup below,
  then delete that rule once ZeroTier is confirmed working.

## 2. Server setup

Log in (via one of the methods above), then:

```bash
git clone git@github.com:d4mz3y/Feedback-System.git
cd Feedback-System
cp .env.example .env
nano .env   # fill in real EMAIL_USER, EMAIL_PASS, RECIPIENT_EMAILS, MONGODB_URI
./deploy/setup.sh feedback.hoganguards.com <ZEROTIER_NETWORK_ID>
```

The script joins the same ZeroTier network as `hg-attendance-prod` (approve the new
device in ZeroTier Central afterward), opens 80/443 in Ubuntu's own firewall (the NSG
allowing them isn't enough — the host firewall blocks them independently), installs
Docker, nginx and certbot, builds and starts the app container (bound to
`127.0.0.1:3001` only — never exposed directly), configures nginx as a reverse proxy,
and obtains a Let's Encrypt certificate for the domain.

Once ZeroTier is confirmed working, remove any temporary port-22 rule and do all
future admin access over ZeroTier.

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
