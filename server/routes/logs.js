const express = require("express")
const router = express.Router()
const sqlite3 = require("sqlite3").verbose()
const fs = require('fs')
const path = require('path')
const adminAuth = require('../middleware/adminAuth')

console.log("[routes/logs] loaded")

const db = new sqlite3.Database("database/trash.db")

// Wait time to block consecutive logs for the same bin (in seconds)
// Set to 10 minutes (600 seconds)
const DUPLICATE_WINDOW_SECONDS = 60 * 10

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
`SELECT username FROM users WHERE username = ? COLLATE NOCASE`,
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

/* Use the canonical username as stored in the users table so casing
	is consistent for logs. */
const canonicalUser = user.username

/* CHECK LAST BIN LOG (prevent consecutive logs for same bin regardless of user)
	 We look up the most recent log for the bin (if any) and block a new log
	 if it occurred within DUPLICATE_WINDOW_SECONDS seconds. */

db.get(
	`SELECT timestamp, username FROM logs WHERE bin_id=? ORDER BY timestamp DESC LIMIT 1`,
	[bin_id],
	(err, row) => {

		if (err) {
			console.error(err)
			return res.status(500).json({ success: false })
		}

		if (row) {
			const last = new Date(row.timestamp).getTime()
			const now = Date.now()
			const diff = (now - last) / 1000
			if (diff < DUPLICATE_WINDOW_SECONDS) {
				return res.json({
					success: false,
					duplicate: true,
					seconds_remaining: Math.floor(DUPLICATE_WINDOW_SECONDS - diff)
				})
			}
		}

		/* INSERT LOG */

		db.run(
			`INSERT INTO logs (username,bin_id,timestamp) VALUES (?,?,datetime('now'))`,
			[canonicalUser, bin_id],
			function (err) {

				if (err) {
					console.error(err)
					return res.status(500).json({ success: false })
				}

				res.json({ success: true, id: this.lastID })

			}
		)

	}
)

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

/* -----------------------------
   ACTIVITY (recent logs)      
----------------------------- */

router.get("/activity",(req,res)=>{

	db.all(
		`SELECT username, bin_id, timestamp
		 FROM logs
		 ORDER BY timestamp DESC
		 LIMIT 100`,
		(err,rows)=>{

			if(err){
				console.error(err)
				return res.status(500).json({error:true})
			}

			res.json(rows)

		}
	)

})

/* -----------------------------
   RANKING (most emptied bins)
----------------------------- */

router.get("/ranking",(req,res)=>{

	db.all(
		`SELECT bin_id, COUNT(*) as total
		 FROM logs
		 GROUP BY bin_id
		 ORDER BY total DESC`,
		(err,rows)=>{

			if(err){
				console.error(err)
				return res.status(500).json({error:true})
			}

			res.json(rows)

		}
	)

})

module.exports = router

/* -----------------------------
   ADMIN: Reset / Clear logs
   - Backs up logs to database/backups/logs-<ts>.json before deleting
   - Accepts optional JSON body: { bin_id: <number> } to clear only that bin
   - Protected by adminAuth middleware
----------------------------- */
router.post('/admin/reset-logs', adminAuth, (req, res) => {

	const bin_id = req.body && req.body.bin_id ? req.body.bin_id : null

	// Require a non-default nickname for audit purposes
	if(!req.session || !req.session.username || req.session.username.toLowerCase() === 'buildcat'){
		return res.status(400).json({ success:false, error:'nickname_required', message:'Please set a nickname (not Buildcat) before resetting logs.' })
	}

	// ensure backups dir
	const backupsDir = path.join(__dirname, '..', '..', 'database', 'backups')
	try{ fs.mkdirSync(backupsDir, { recursive: true }) }catch(e){}

	const ts = new Date().toISOString().replace(/[:.]/g,'-')
	const backupFile = bin_id ? `logs-bin-${bin_id}-${ts}.json` : `logs-all-${ts}.json`
	const backupPath = path.join(backupsDir, backupFile)

	const selectSql = bin_id ? 'SELECT * FROM logs WHERE bin_id = ? ORDER BY timestamp' : 'SELECT * FROM logs ORDER BY timestamp'
	const selectParams = bin_id ? [bin_id] : []

	db.all(selectSql, selectParams, (err, rows) => {
		if (err) {
			console.error('Error reading logs for backup', err)
			return res.status(500).json({ success: false, error: 'read_failed' })
		}

		try{
			fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2), { encoding: 'utf8' })
		}catch(e){
			console.error('Error writing backup file', e)
			return res.status(500).json({ success: false, error: 'backup_failed' })
		}

		const deleteSql = bin_id ? 'DELETE FROM logs WHERE bin_id = ?' : 'DELETE FROM logs'
		const deleteParams = bin_id ? [bin_id] : []

		db.run(deleteSql, deleteParams, function(err){
			if(err){
				console.error('Error deleting logs', err)
				return res.status(500).json({ success:false, error:'delete_failed' })
			}

			// run VACUUM to reclaim space (best-effort)
			db.run('VACUUM', [], ()=>{})

			const deletedCount = this && this.changes ? this.changes : null

			// Insert audit log entry recording who performed the reset
			try{
				const adminUsername = (req && req.session && req.session.username) ? req.session.username : (req && req.session && req.session.admin ? 'admin' : 'unknown')
				const details = JSON.stringify({ bin_id: bin_id, deleted: deletedCount, backup: backupPath })
				db.run(`INSERT INTO audit_logs (admin_username, action, details) VALUES (?,?,?)`, [adminUsername, 'reset-logs', details], function(aerr){
					if(aerr){
						console.error('Failed to write audit log', aerr)
						// continue even if audit write fails
					}
					// respond to client after attempting audit insert
					res.json({ success:true, deleted: deletedCount, backup: backupPath })
				})
			}catch(e){
				console.error('Audit logging error', e)
				res.json({ success:true, deleted: deletedCount, backup: backupPath })
			}
		})

	})

})
