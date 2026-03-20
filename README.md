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

## Running with PM2 (recommended for production/event hosts)

This app is compatible with `pm2` — it runs the same Express process and routes when managed by pm2. A provided `ecosystem.config.js` already points at `server/server.js` and sets the working directory.

Quick pm2 commands:

```bash
pm2 start ecosystem.config.js            # start (development env)
pm2 start ecosystem.config.js --env production  # start with production env
pm2 restart trash_heatmap                # restart after code changes
pm2 logs trash_heatmap                    # view stdout/stderr logs
pm2 save                                  # persist process list across reboots
pm2 startup                                # generate systemd startup script
```

Notes when using pm2:
- Ensure the user running pm2 has write permissions to `database/backups/` (used by the reset tool).
- If you enable `watch` in pm2, add `ignore_watch: ['database/backups','logs','node_modules']` to avoid restarts when backups or logs are written.
- Configure environment variables (see below) in `ecosystem.config.js` under `env_production` and start with `--env production`.

## Important environment variables

Set these in your shell or `ecosystem.config.js` when running under pm2:

- `PORT` — listen port (default: 3001)
- `SESSION_SECRET` — session cookie secret (avoid the default in production)
- `PUBLIC_HOST` / `PUBLIC_PROTOCOL` — used when building absolute URLs (QR generation, logs)

Example snippet (in `ecosystem.config.js`):

```js
env_production: {
	NODE_ENV: 'production',
	PORT: 3001,
	SESSION_SECRET: process.env.SESSION_SECRET || 'KuMm1tus',
	PUBLIC_HOST: 'tyhjennys.dy.fi',
	PUBLIC_PROTOCOL: 'https'
}
```

## Admin tool: Reset / Clear logs

An admin-only HTTP endpoint lets you back up and clear bin logs safely. It is protected by the same admin session used for the admin pages.

- Endpoint: `POST /api/admin/reset-logs`
- Body (JSON): `{}` to clear all logs, or `{ "bin_id": 7 }` to clear only bin 7
- Behavior: backs up selected logs to `database/backups/` as a timestamped JSON file, then deletes the rows and runs `VACUUM`.
- Usage (example):

```bash
# login as admin (save cookies)
curl -c admin_cookies.txt -H "Content-Type: application/json" \
	-d '{"username":"Buildcat","password":"buildcat"}' \
	-X POST http://127.0.0.1:3001/api/admin/login

# clear all logs (admin session required)
curl -b admin_cookies.txt -X POST -H "Content-Type: application/json" \
	-d '{}' http://127.0.0.1:3001/api/admin/reset-logs -v
```

Backups are saved under `database/backups/` (created automatically). The endpoint returns a JSON response with `backup` path and `deleted` count when successful.

## Username matching: case-insensitive logging

The bin-logging API now accepts usernames case-insensitively. That means workers can enter `User`, `user`, or `uSer` and the server will match the registered user regardless of case and record the canonical username from the `users` table in logs. This prevents accidental duplicates and normalizes display in reports.

If you prefer a different canonicalisation (for example always store lower-case usernames), consider normalizing usernames on insert in `server/routes/users.js`.

## Logout behavior (client/server)

Logout was hardened so browsers send session cookies and the server clears them reliably:

- Client: `public/js/site.js` now includes `credentials: 'same-origin'` on logout requests so the session cookie is sent.
- Server: `POST /api/admin/logout` destroys the session and clears the `connect.sid` cookie.

When testing over HTTPS, ensure you access the site with the same hostname used in the certificate (or use `curl --resolve` to map the host to localhost for testing). Use an incognito/private browser window to avoid stale cookies when validating logout behavior.

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
