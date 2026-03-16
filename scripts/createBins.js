const db = require("../server/db")

for(let i=0;i<=55;i++){

db.run(
"INSERT OR IGNORE INTO bins(id,x,y) VALUES(?,?,?)",
[i,0,0]
)

}

console.log("56 bins created")