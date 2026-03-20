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

// Support optional time-range filtering via query parameter `range`
// Accepted values: 'hour', 'day', 'week' (case-insensitive). If provided,
// only logs newer than the specified window are counted.
router.get("/heatmap",(req,res)=>{

	const range = (req.query && req.query.range) ? String(req.query.range).toLowerCase() : null

	let timeClause = ''
	if(range === 'hour') timeClause = "datetime('now','-1 hour')"
	else if(range === 'day' || range === '24h') timeClause = "datetime('now','-24 hours')"
	else if(range === 'week') timeClause = "datetime('now','-7 days')"

	let sql
	if(timeClause){
		// Count only logs newer than timeClause using conditional aggregation so bins with zero still appear
		sql = `SELECT bins.x,bins.y, COUNT(CASE WHEN logs.timestamp >= ${timeClause} THEN 1 END) as value
			   FROM bins
			   LEFT JOIN logs ON bins.id = logs.bin_id
			   GROUP BY bins.id`
	}else{
		sql = `SELECT bins.x,bins.y, COUNT(logs.id) as value
			   FROM bins
			   LEFT JOIN logs ON bins.id = logs.bin_id
			   GROUP BY bins.id`
	}

	db.all(sql, (err,rows)=>{
		if(err){
			console.error('heatmap query failed', err)
			return res.status(500).json({ error: 'db_failed' })
		}
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