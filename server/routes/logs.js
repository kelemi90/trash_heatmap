const express = require("express")
const router = express.Router()
const sqlite3 = require("sqlite3").verbose()

const db = new sqlite3.Database("database/trash.db")

const DUPLICATE_WINDOW_SECONDS = 120

router.post("/log",(req,res)=>{

const {username, bin_id} = req.body

if(!username || !bin_id){

return res.json({
success:false,
error:"Missing username or bin_id"
})

}

/* VERIFY USER EXISTS */

db.get(
`SELECT username FROM users WHERE username=?`,
[username],
(err,user)=>{

if(err){
console.error(err)
return res.status(500).json({success:false})
}

if(!user){

return res.json({
success:false,
invalid_user:true
})

}

/* CHECK LAST BIN LOG */

db.get(
`SELECT timestamp FROM logs
WHERE bin_id=?
ORDER BY timestamp DESC
LIMIT 1`,
[bin_id],
(err,row)=>{

if(err){
console.error(err)
return res.status(500).json({success:false})
}

if(row){

const last = new Date(row.timestamp).getTime()
const now = Date.now()

const diff = (now-last)/1000

if(diff < DUPLICATE_WINDOW_SECONDS){

return res.json({
success:false,
duplicate:true,
seconds_remaining:Math.floor(DUPLICATE_WINDOW_SECONDS-diff)
})

}

}

/* INSERT LOG */

db.run(
`INSERT INTO logs (username,bin_id,timestamp)
VALUES (?,?,datetime('now'))`,
[username,bin_id],
function(err){

if(err){
console.error(err)
return res.status(500).json({success:false})
}

res.json({
success:true,
id:this.lastID
})

})

})

})

})

/* DEBUG ENDPOINT */

router.get("/logs",(req,res)=>{

db.all(
`SELECT * FROM logs
ORDER BY timestamp DESC
LIMIT 100`,
(err,rows)=>{

if(err){
console.error(err)
return res.status(500).json({error:true})
}

res.json(rows)

})

})

module.exports = router