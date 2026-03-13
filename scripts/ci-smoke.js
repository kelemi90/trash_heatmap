// Basic smoke tests used by CI
// Runs a few requests against localhost:3001 and exits non-zero on failure

async function run(){
  const endpoints = [
    { path: '/dashboard.html', expect: [200,302] },
    { path: '/api/heatmap', expect: [200] },
    { path: '/api/status', expect: [200] },
    { path: '/api/ranking', expect: [200] }
  ]

  const base = 'http://127.0.0.1:3001'
  const failures = []

  for(const e of endpoints){
    try{
      const res = await fetch(base + e.path)
      if(!e.expect.includes(res.status)){
        failures.push(`${e.path} returned ${res.status}`)
      }
    }catch(err){
      failures.push(`${e.path} fetch error: ${err.message}`)
    }
  }

  if(failures.length){
    console.error('Smoke tests failed:')
    failures.forEach(f=>console.error(' -',f))
    process.exit(1)
  }

  console.log('Smoke tests passed')
  process.exit(0)
}

// Node 18+ has global fetch; for older runtimes we'd polyfill but CI uses Node 18
run()
