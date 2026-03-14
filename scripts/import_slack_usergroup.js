// scripts/import_slack_usergroup.js
// Import users from a Slack User Group (e.g. @build) into the Trash Heatmap app
// Usage examples:
//   SLACK_TOKEN=xoxb-... node scripts/import_slack_usergroup.js --group=build --dry
//   SLACK_TOKEN=xoxb-... node scripts/import_slack_usergroup.js --group=build --commit --method=http
//
// Options:
//   --group=HANDLE_OR_NAME   The usergroup handle (preferred) or name (e.g. build)
//   --dry                    Show what would be imported (default)
//   --commit                 Perform inserts
//   --method=db|http         Insert directly into sqlite DB (db) or POST to server (http). Default: db
//   SERVER_URL env var used when method=http (default http://localhost:3001)

const fetch = global.fetch || require('node-fetch')
const sqlite3 = require('sqlite3').verbose()
const { argv, env } = require('process')

const SLACK_TOKEN = env.SLACK_TOKEN
if(!SLACK_TOKEN){
  console.error('Set SLACK_TOKEN env var (Bot token, xoxb-...)')
  process.exit(1)
}

const args = argv.slice(2)
const groupArg = args.find(a=>a.startsWith('--group='))
if(!groupArg){
  console.error('Pass --group=build (usergroup handle or name)')
  process.exit(1)
}
const groupName = groupArg.split('=')[1]
const dry = args.includes('--dry') || !args.includes('--commit')
const methodArg = args.find(a=>a.startsWith('--method=')) || '--method=db'
const method = methodArg.split('=')[1] || 'db'
const serverUrl = process.env.SERVER_URL || 'http://localhost:3001'

async function fetchSlack(path, params={}){
  const url = new URL(`https://slack.com/api/${path}`)
  Object.keys(params).forEach(k=> url.searchParams.set(k, params[k]))
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${SLACK_TOKEN}` } })
  const js = await res.json()
  if(!js.ok) throw new Error(`${path} failed: ${JSON.stringify(js)}`)
  return js
}

async function findUserGroup(handleOrName){
  const js = await fetchSlack('usergroups.list')
  const groups = js.usergroups || []
  return groups.find(g => (g.handle && g.handle.toLowerCase()===handleOrName.toLowerCase()) || (g.name && g.name.toLowerCase()===handleOrName.toLowerCase()))
}

async function fetchGroupMembers(usergroupId){
  const js = await fetchSlack('usergroups.users.list', { usergroup: usergroupId })
  return js.users || []
}

function normalizeUsername(user){
  if(user.profile && user.profile.display_name && user.profile.display_name.trim()) return user.profile.display_name.trim()
  if(user.name && user.name.trim()) return user.name.trim()
  if(user.profile && user.profile.real_name && user.profile.real_name.trim()) return user.profile.real_name.trim()
  return null
}

async function fetchAllUsers(){
  // single call to users.list (handles pagination internally via Slack cursor)
  let all = []
  let cursor = undefined
  do{
    const params = { limit: 200 }
    if(cursor) params.cursor = cursor
    const js = await fetchSlack('users.list', params)
    all = all.concat(js.members || [])
    cursor = js.response_metadata && js.response_metadata.next_cursor ? js.response_metadata.next_cursor : undefined
  }while(cursor)
  return all
}

async function run(){
  console.log('Looking up user group:', groupName)
  const group = await findUserGroup(groupName)
  if(!group){
    console.error('User group not found. Make sure the handle or name is correct and your token has usergroups:read scope')
    process.exit(1)
  }
  console.log('Found user group:', group.handle || group.name, 'id=', group.id)

  const memberIds = await fetchGroupMembers(group.id)
  console.log('Members in group:', memberIds.length)

  const users = await fetchAllUsers()
  const usersMap = new Map(users.map(u=>[u.id,u]))

  const candidates = memberIds.map(id=> usersMap.get(id)).filter(Boolean)
    .filter(u=> !u.deleted && !u.is_bot && u.id !== 'USLACKBOT')
    .map(u=> ({ id:u.id, username: normalizeUsername(u) }))
    .filter(u=>u.username)

  console.log('Candidates (active humans):', candidates.length)
  if(dry){
    console.log('Dry run — the following would be added:')
    candidates.forEach(c=> console.log('-', c.username))
    return
  }

  if(method === 'db'){
    const db = new sqlite3.Database('database/trash.db')
    await new Promise((resolve,reject)=>{
      db.serialize(()=>{
        const stmt = db.prepare('INSERT INTO users (username) VALUES (?)')
        const check = db.prepare('SELECT id FROM users WHERE username = ? LIMIT 1')
        let added=0, skipped=0
        const tasks = candidates.map(c=> new Promise((res,rej)=>{
          check.get([c.username], (err,row)=>{
            if(err) return rej(err)
            if(row){ skipped++; return res() }
            stmt.run([c.username], function(err){
              if(err){ skipped++; return res() }
              added++
              res()
            })
          })
        }))
        Promise.all(tasks).then(()=>{
          stmt.finalize(); check.finalize(); db.close();
          console.log(`Done: added=${added}, skipped=${skipped}`)
          resolve()
        }).catch(reject)
      })
    })
  } else if(method === 'http'){
    let added=0, skipped=0
    for(const c of candidates){
      try{
        const res = await fetch(`${serverUrl}/api/users`,{
          method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ username: c.username })
        })
        const js = await res.json()
        if(js && js.success) added++
        else skipped++
      }catch(e){ console.error('Error posting',c.username,e); skipped++ }
    }
    console.log(`Done: added=${added}, skipped=${skipped}`)
  } else {
    console.error('Unknown method', method)
    process.exit(1)
  }
}

run().catch(err=>{
  console.error('Fatal:', err && err.stack ? err.stack : err)
  process.exit(1)
})
