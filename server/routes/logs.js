const express = require("express")
const router = express.Router()
const db = require("../db")

router.post("/empty",(req,res)=>{

const {bin_id,user} = req.body

db.get(
    "SELECT timestamp FROM logs WHERE bin_id=? ORDER BY timestamp DESC LIMIT 1",
    [bin_id],
    (err,row)=>{
        if(row){
            const last = new Date(row.timestamp).getTime()
            const now = Date.now()
            const diffMinutes = (now - last) / 60000

            // Prevent dublicate within 2 minutes
            if(diffMinutes < 2){
                return res.json({
                    success:false,
                    message:"Bin was emptied recently"
                })
            }
        }


    }
)

db.run(
    "INSERT INTO logs(bin_id,user) VALUES(?,?)",
    [bin_id,user]
)

res.json({
    success:true,
    message:"Bin logged"
})

})

router.get("/activity", (req,res)=>{
scrollBy.all(`
SELECT user,bin_id,timestamp
FROM logs
ORDER BY timestamp DESC
LIMIT 20
`,(err,rows)=>{

res.json(rows)
})

})

router.get("/ranking",(req,res)=>{

db.all(`
SELECT bin_id, COUNT(*) as total
FROM logs
GROUP BY bin_id
ORDER BY total DESC
`,(err,rows)=>{

res.json(rows)

})

})

module.exports = router