const express = require("express")
const router = express.Router()
const db = require("../db")

router.get("/bins",(req,res)=>{

db.all("SELECT * FROM bins",(err,rows)=>{
res.json(rows)
})

})

router.post("/bin/update",(req,res)=>{

const {id,x,y} = req.body

db.run(
"UPDATE bins SET x=?,y=? WHERE id=?",
[x,y,id]
)

res.json({success:true})

})

router.get("/heatmap",(req,res)=>{

db.all(`
SELECT bins.x,bins.y,COUNT(logs.id) as value
FROM bins
LEFT JOIN logs ON bins.id = logs.bin_id
GROUP BY bins.id
`,(err,rows)=>{

res.json(rows)

})

})

router.get("/status",(req,res)=>{

db.all(`
SELECT bins.id,bins.x,bins.y,
MAX(logs.timestamp) as last
FROM bins
LEFT JOIN logs ON bins.id = logs.bin_id
GROUP BY bins.id
`,(err,rows)=>{

res.json(rows)

})

})

module.exports = router