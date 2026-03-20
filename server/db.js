const sqlite3 = require("sqlite3").verbose()

const db = new sqlite3.Database("./database/trash.db")

db.serialize(() => {

db.run(`
CREATE TABLE IF NOT EXISTS users(
id INTEGER PRIMARY KEY AUTOINCREMENT,
username TEXT UNIQUE,
password TEXT,
role TEXT
)`)

db.run(`
CREATE TABLE IF NOT EXISTS bins(
id INTEGER PRIMARY KEY,
x INTEGER,
y INTEGER
)`)

db.run(`
CREATE TABLE IF NOT EXISTS logs(
id INTEGER PRIMARY KEY AUTOINCREMENT,
username TEXT,
bin_id INTEGER,
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`)

db.run(`
CREATE TABLE IF NOT EXISTS audit_logs(
id INTEGER PRIMARY KEY AUTOINCREMENT,
admin_username TEXT,
action TEXT,
details TEXT,
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
`)

})

module.exports = db