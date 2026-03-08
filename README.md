# trash_heatmap
Trash bin heatmap application for event use.


Users (phones)
     │
     │ scan QR code
     ▼
Web App (mobile browser)
     │
     │ login + submit bin emptied
     ▼
Node.js Server (Ubuntu laptop)
     │
     ├── Database (SQLite or PostgreSQL)
     │
     ├── Admin Dashboard
     │
     ├── Heatmap Generator
     │
     └── Reports + Statistics


# Structure

trash_heatmap
│
├── server
│   ├── server.js
│   ├── db.js
│   └── routes
│       ├── auth.js
│       ├── bins.js
│       └── logs.js
│
├── database
│   └── trash.db
│
├── public
│   ├── index.html
│   ├── login.html
│   ├── bin.html
│   ├── admin.html
│   ├── map.html
│   ├── js
│   │   ├── map.js
│   │   └── heatmap.js
│   └── map
│       └── pohjakartta.png
│
├── scripts
│   └── createBins.js
│
├── package.json
└── README.md