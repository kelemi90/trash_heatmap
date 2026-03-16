Raspberry Pi 3 deployment notes — Trash Heatmap
===============================================

This document describes how to host the Trash Heatmap app on a Raspberry Pi 3, serve it at
`tyhjennys.dy.fi`, obtain TLS, and keep the dy.fi DNS entry updated automatically.

Overview
--------
- Run the Node app (Express) on the Pi (port 3001 by default).
- Use `nginx` as a reverse proxy for `tyhjennys.dy.fi` and terminate TLS with Let's Encrypt.
- Use a dynamic-DNS updater (ddclient or a small curl script) to update the dy.fi record whenever
  your public IP changes.
- Ensure your router forwards ports 80 and 443 to the Pi and that the Pi has a stable LAN IP.

Prerequisites
-------------
- Raspberry Pi 3 with Raspberry Pi OS (Bullseye or newer recommended).
- Root / sudo access on the Pi.
- A dy.fi account and access to the dynamic DNS update credentials (token/password) for `tyhjennys.dy.fi`.
- Access to your router to create a DHCP reservation or static mapping for the Pi and forward ports 80/443.

Step-by-step (summary)
-----------------------
1. Prepare the Pi: install Node.js, npm, git, nginx, certbot, and ddclient (or curl). Ensure Pi has static LAN IP.
2. Clone this repo into e.g. `/opt/trash_heatmap` and run `npm ci`.
3. Create a systemd service to run the app (template provided at `scripts/pi/trash_heatmap.service`).
4. Configure nginx site (template at `scripts/pi/nginx_tyhjennys.conf`) and enable it.
5. Obtain TLS cert with certbot (`sudo certbot --nginx -d tyhjennys.dy.fi`).
6. Configure dy.fi dynamic update using `ddclient` or the provided `tyhjennys_dd_update.sh` script. Add as a systemd timer or cron job.
7. Start and enable services: `systemctl enable --now trash_heatmap` and ddclient/timer.

Files included
--------------
- `trash_heatmap.service` — systemd unit template for the Node app (in this repo under `scripts/pi/`).
- `nginx_tyhjennys.conf` — example nginx server block for `tyhjennys.dy.fi`.
- `ddclient.conf` — example ddclient configuration (edit with your credentials).
- `tyhjennys_dd_update.sh` — tiny update script if you prefer curl-based updates.

Notes about dy.fi
------------------
I don't assume a particular API endpoint for dy.fi here. Some dy.fi-style providers accept a simple
HTTP update call (for example: `https://dy.fi/update?host=tyhjennys&token=...&ip=...`). Check your dy.fi account
control panel or documentation to get the correct update URL and token. If dy.fi supports the standard
DynDNS protocol, `ddclient` can be used directly; otherwise use the curl script and point it to your update URL.

Security and maintenance
------------------------
- Keep your SLACK_TOKEN and any update tokens out of source control. Use environment variables or
  `~/.config/trash_heatmap.env` (read by the systemd unit) to store secrets.
- Use Certbot auto-renewal (installed by default as a timer) to keep certificates valid.
- Monitor logs with `journalctl -u trash_heatmap -f` and `sudo tail -f /var/log/nginx/error.log`.

If you want, I can add the systemd/nginx/ddclient templates into the repo now (they are already added),
and provide the exact commands to run on your Pi. If you prefer, paste the dy.fi update URL and I can
customize `tyhjennys_dd_update.sh` for you.
