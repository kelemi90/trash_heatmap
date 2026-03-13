const express = require("express")
const router = express.Router()
const sqlite3 = require("sqlite3").verbose()

const db = new sqlite3.Database("database/trash.db")

/* -----------------------------
   GET ALL USERS
----------------------------- */

router.get("/users", (req,res)=>{

    db.all(
        `SELECT id, username FROM users ORDER BY username`,
        [],
        (err,rows)=>{

            if(err){
                return res.status(500).json({error:err.message})
            }

            res.json(rows)

        }
    )

})

/* -----------------------------
   ADD USER
----------------------------- */

router.post("/users",(req,res)=>{

    const {username} = req.body

    if(!username){
        return res.json({success:false})
    }

    db.run(
        `INSERT INTO users (username) VALUES (?)`,
        [username],
        function(err){

            if(err){
                return res.json({success:false,error:"exists"})
            }

            res.json({
                success:true,
                id:this.lastID
            })

        }
    )

})

/* -----------------------------
   DELETE USER
----------------------------- */

router.delete("/users/:id",(req,res)=>{

    const id = req.params.id

    db.run(
        `DELETE FROM users WHERE id=?`,
        [id],
        function(err){

            if(err){
                return res.status(500).json({success:false})
            }

            res.json({success:true})

        }
    )

})

module.exports = router