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
bin_id INTEGER,
user TXT,
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`)

})

module.exports = db