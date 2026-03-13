const fs = require('fs')
const path = require('path')

const LOG_DIR = path.join(__dirname, '..', 'logs')
if(!fs.existsSync(LOG_DIR)){
  try{ fs.mkdirSync(LOG_DIR) }catch(e){}
}

const LOG_FILE = path.join(LOG_DIR, 'server.log')

function timestamp(){
  return new Date().toISOString()
}

function write(level, msg){
  const line = `[${timestamp()}] [${level}] ${msg}\n`
  try{
    fs.appendFileSync(LOG_FILE, line)
  }catch(e){
    // fallback to console if file write fails
    console.error('Failed to write log', e)
    console.log(line)
  }
}

module.exports = {
  info: (msg)=> write('INFO', typeof msg === 'string' ? msg : JSON.stringify(msg)),
  error: (msg)=> write('ERROR', typeof msg === 'string' ? msg : (msg && msg.stack) ? msg.stack : JSON.stringify(msg)),
  warn: (msg)=> write('WARN', typeof msg === 'string' ? msg : JSON.stringify(msg))
}
