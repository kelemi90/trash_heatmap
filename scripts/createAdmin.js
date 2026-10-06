const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })
const bcrypt = require("bcrypt")
const db = require("../server/db")

const username = process.env.ADMIN_USERNAME
const plainPassword = process.env.ADMIN_PASSWORD

if(!username || !plainPassword){
	throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env or the environment")
}

const password = bcrypt.hashSync(plainPassword,10)

db.run(
"INSERT OR IGNORE INTO users(username,password,role) VALUES(?,?,?)",
[username, password, "admin"]
)

console.log("Admin created")