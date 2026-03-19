# Trash Heatmap

[![build status](https://img.shields.io/badge/build-local-brightgreen.svg)](https://github.com/kelemi90/trash_heatmap)
[![tests](https://img.shields.io/badge/tests-none-lightgrey.svg)](#)

Trash Heatmap is a lightweight event management system for tracking when trash bins are emptied during large indoor events.

Workers scan a QR code attached to each trash bin and log when the bin has been emptied. The system collects this data and generates insights such as:

- Heatmaps of bin usage
- Worker activity tracking
- Most frequently emptied bins
- Recommendations for optimal bin placement next year

The system is designed to run on a **local Ubuntu laptop server** inside the event network.

---

# Features

### QR Code Bin Logging
Each trash bin has a QR code.

When scanned, the worker is taken to a logging page where they confirm:

- bin number
- their username

The system logs:

- worker name
- bin ID
- timestamp

---

### Smart Duplicate Protection

To prevent accidental double logging:

- Same worker cannot log the same bin within **2 minutes**

---

### Admin Panel

Admin can:

- Add workers
- Delete workers
- View registered users

Protected login required.

Default admin login:
username: Buildcat
password: buildcat

---

### Drag & Drop Bin Placement

Saturday June 6 2026
# Trash Heatmap

Trash Heatmap is a lightweight local web app for tracking when trash bins are emptied during an event. Workers scan a QR code on a bin and the system records the empties. The data is used to build heatmaps, worker activity views, and simple reports to help optimize bin placement.

This repo is intended to run on a local development machine or event laptop inside the venue network.

----

## What changed (recent edits)

- Dashboard JavaScript moved from inline HTML into `public/js/dashboard.js`.
- Heatmap overlay implemented using `heatmap.js` and aligned to the map image.
- Admin protection: `bin_editor.html` and `qr_labels.html` are now protected server-side and redirect to `/admin_login.html` when the user is not logged in.
- Client helper `public/js/site.js` exposes `markActiveNav()` and `adjustNavbarAuth()` (hides admin links for logged-out users and toggles Login/Logout UI).
- New charts page `public/bin_times.html` (Chart.js) with CSV export of bins & logs and interactive filtering.
- Server logging added: `logs/server.log` records requests and server errors.

----

## Features

- QR code based bin logging (workers scan and log empties)
- Heatmap visualization of bin usage
- Live-ish dashboard with worker activity and top-used bins
- Drag & drop bin placement editor (admin)
- Protected admin pages (session login)
- CSV export for bins and logs; Chart.js visualizations

----

## Quickstart (development)

Clone and install:
```bash
git clone https://github.com/kelemi90/trash_heatmap.git
cd trash_heatmap
npm install
```

Start the server:
```bash
node server/server.js
```

The server listens on port 3001 by default. It logs the local network address on startup, for example `http://192.168.50.37:3001`.

Open the dashboard in a browser:
```
http://localhost:3001/dashboard.html
```

----

## Deployment (production)

This project can be run behind nginx with a process manager (pm2) in production. Key points for deploying QR codes and the app:

- SITE_URL: set the public URL the application will use when generating QR codes. Example:

```bash
export SITE_URL="https://tyhjennys.dy.fi"
```

- Using pm2 (recommended):

```bash
# from the project root on the server
git pull origin main
npm ci --production
# quick update using current shell env
export SITE_URL="https://tyhjennys.dy.fi"
pm2 restart trash_heatmap --update-env

# or reload using the ecosystem file (reads env_production)
pm2 reload ecosystem.config.js --env production
```

- Ensure any sensitive files (for example `.env`) are moved out of `public/` so they are not served by nginx:

```bash
mv public/.env ./.env
chmod 600 ./.env
```

- Nginx: serve `public/` as the web root and proxy `/api/` to the Node server (3001). See `/etc/nginx/sites-available/trash_heatmap` for a recommended site file. After editing nginx config:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

- Once HTTP is stable, obtain TLS with Certbot:

```bash
sudo certbot --nginx -d tyhjennys.dy.fi -d www.tyhjennys.dy.fi
```

After deployment, the QR generator uses `SITE_URL` to build URLs embedded in QR codes (e.g. `https://tyhjennys.dy.fi/bin.html?bin=42`). Set `SITE_URL` to `https://tyhjennys.dy.fi` to produce secure links.

----

## Admin access

There is a simple admin login flow used for the demo/dev setup. Default credentials used in this project:

- username: `Buildcat`
- password: `buildcat`

Use `/admin_login.html` to sign in. Once signed in, the server will set a session and admin-only pages (`/admin.html`, `/bin_editor.html`, `/qr_labels.html`) become accessible.

To check login status from client-side code the app uses `/api/admin/check`.

----

## Important server-side endpoints (examples)

- `GET /api/status` — returns the current list of bins and last-empty timestamps
- `GET /api/heatmap` — returns heatmap points (x,y,value)
- `GET /api/activity` — recent logs / worker activity
- `GET /api/ranking` — empties per bin (for Top Used Bins)
- `POST /api/admin/login` — admin login
- `POST /api/admin/logout` — admin logout

Use these endpoints from the frontend pages (dashboard, charts) — they are already wired into the client code.

----

## Logging

Server requests and errors are written to `logs/server.log`. This helps triage crashes and unexpected errors during an event. Tail the file during testing:

```bash
tail -f logs/server.log
```

----

## Project structure (high level)

```
trash_heatmap/
├─ public/               # static UI pages and client JS
│  ├─ components/navbar.html
│  ├─ js/site.js         # site helpers: logout, markActiveNav, adjustNavbarAuth
│  ├─ js/dashboard.js    # dashboard logic (heatmap + markers)
│  ├─ js/bin_times.js    # charts page
│  └─ map/*
├─ server/
│  ├─ middleware/adminAuth.js
│  ├─ routes/*.js        # API routes (auth, bins, logs, users, qrLabels)
│  └─ server.js          # app entrypoint
├─ database/             # sqlite DB file
└─ README.md
```

----

## Notes & next steps

- The admin credentials are hard-coded for demo purposes. Move to a proper user table or environment-driven secrets for production.
- The server uses a basic file logger; consider rotating logs or using a structured logger (winston/pino) for production.
- Navbar link hiding is client-side only — server-side routes remain protected (so URLs aren't accessible without login).

----

## License

MIT

----

## Troubleshooting (quick)

- Problem: "Server not starting / port already in use"
	- Cause: another process is listening on port 3001 or a previous server instance didn't exit.
	- Fix: find and stop the process (e.g., `lsof -i :3001` then `kill <pid>`), or change port in `server/server.js` temporarily.

- Problem: "Pages still visible when logged out"
	- Cause: client-side navbar hiding is UX-only. The server already protects `admin.html`, `bin_editor.html` and `qr_labels.html` via middleware. Make sure you restarted the server after the change.
	- Fix: Verify server routes by requesting the page directly (curl -I http://localhost:3001/bin_editor.html) — you should see a 302 redirect to `/admin_login.html` when unauthenticated.

- Problem: "Heatmap misaligned on the map image"
	- Cause: heatmap renderer was created before the map image finished loading, or the page has padding/margins that offset the image.
	- Fix: Refresh the page; the code now waits for image load before creating the heatmap. If alignment still looks off, try adding `?debug=1` to the dashboard URL to display debug dots at heatmap points.

- Problem: "Unable to generate QR codes / blank images"
	- Cause: server dependency for QR generation may be missing or the QR endpoint returned an error.
	- Fix: Check server logs (`tail -f logs/server.log`) for errors from `/api/qr/:id` and confirm `qrcode` package is installed. Restart server after installing missing deps.

If you hit any other issues, tail `logs/server.log` for detailed request and error traces.
