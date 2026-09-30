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
3. **Domain**: using [nip.io](https://nip.io) instead of a `hoganguards.com` DNS record
   — no DNS access needed, and Let's Encrypt issues a real certificate for it since
   it's a genuine (auto-generated) DNS name. Once the instance has its public IP, the
   domain is just `<public-ip-with-dots-replaced-by-dashes-or-dots>.nip.io` — nip.io
   accepts the IP with dots as-is, e.g. public IP `192.0.2.10` → domain
   `192.0.2.10.nip.io`. Nothing to configure; it resolves automatically.
   Swappable later: once someone with access to `hoganguards.com`'s DNS adds a real
   `feedback.hoganguards.com` A record, switch over by rerunning
   `sudo certbot --nginx -d feedback.hoganguards.com` on the server — no redeploy needed.
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
./deploy/setup.sh <PUBLIC_IP>.nip.io <ZEROTIER_NETWORK_ID>
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
curl -I https://<PUBLIC_IP>.nip.io
```

Submit a test entry through the form and confirm the notification email arrives.

## 4. Redeploying after code changes

```bash
cd ~/Feedback-System
git pull
docker compose up -d --build
```

## 5. Admin dashboard, initial accounts, and backups

The admin dashboard (`/admin`) is enabled automatically once `MONGODB_URI` is set in
`.env`. Two one-time steps to get it working:

```bash
# Generate a session secret and add it to .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# paste the output as SESSION_SECRET in .env

# Rebuild so the container picks up the new .env, then create the 5 admin accounts
docker compose up -d --build
docker compose exec feedback-app node scripts/seed-admins.js
```

The seed script prints a temporary password for each new account — share each one
with its owner over a channel other than email (e.g. a call, or in person) and have
them change it via the "Change Password" button after their first login. Re-running
the script is safe; it skips any email that already has an account.

**Backups**: `scripts/backup.js` dumps all submissions to a local JSON file (rotated
after 30 days) and emails a copy to `EMAIL_USER` for off-box redundancy. Set it up as
a daily cron job on the server:

```bash
crontab -e
# add this line to run daily at 2am:
0 2 * * * cd /home/ubuntu/Feedback-System && docker compose exec -T feedback-app node scripts/backup.js >> backup.log 2>&1
```

## Notes

- The app container only listens on `127.0.0.1:3001` on the host — nginx is the only
  thing exposed to the internet, terminating TLS and reverse-proxying to the app.
- `.env` is never committed — it's created directly on the server from `.env.example`.
- Rate limiting (5 submissions/IP/15min) is enforced in the app itself, no extra
  nginx config needed for that.
- The admin dashboard is read-only by design — submissions can't be edited or
  deleted through it, so original client answers never change after submission.
