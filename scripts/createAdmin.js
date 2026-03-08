const bcrypt = require("bcrypt")
const db = require("../server/db")

const password = bcrypt.hashSync("buildcat",10)

db.run(
"INSERT OR IGNORE INTO users(username,password,role) VALUES(?,?,?)",
["Buildcat", password, "admin"]
)

console.log("Admin created")