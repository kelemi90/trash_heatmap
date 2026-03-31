// Simple page to show bins positioned by x,y and their last emptying time

const tooltip = document.getElementById('tooltip')
const binsList = document.getElementById('binsList')
const logsDiv = document.getElementById('logs')

const ctxLast = document.getElementById('chartLastEmpty').getContext('2d')
const ctxEmpties = document.getElementById('chartEmpties').getContext('2d')

let chartLast = null
let chartEmpties = null
let logsCache = []
let currentFilterBin = null
let isAdmin = false

function minutesAgo(ts){
  if(!ts) return null
  const d = parseTimestamp(ts)
  if(!d || isNaN(d.getTime())) return null
  return Math.round((Date.now() - d.getTime())/60000)
}

function niceTimeAgo(ts){
  if(!ts) return 'never'
  const d = parseTimestamp(ts)
  if(!d || isNaN(d.getTime())) return 'never'
  const s = Math.floor((Date.now() - d.getTime())/1000)
  if(s < 60) return `${s}s ago`
  const m = Math.floor(s/60)
  if(m < 60) return `${m}m ago`
  const h = Math.floor(m/60)
  if(h < 24) return `${h}h ${m%60}m ago`
  const days = Math.floor(h/24)
  return `${days}d ${h%24}h ago`
}

function colorByRecency(ts){
  if(!ts) return '#7f8c8d'
  const minutes = minutesAgo(ts)
  if(minutes > 120) return '#e74c3c'
  if(minutes > 60) return '#f39c12'
  return '#2ecc71'
}

function parseTimestamp(ts){
  // SQLite datetime('now') returns "YYYY-MM-DD HH:MM:SS" in UTC.
  // Browsers may not parse that reliably, so normalize to ISO with Z (UTC).
  if(!ts) return null
  if(typeof ts === 'number') return new Date(ts)
  const s = String(ts).trim()
  // if already ISO-like, let Date parse it
  if(/^\d{4}-\d{2}-\d{2}T/.test(s) || /Z$/.test(s) ) return new Date(s)
  // if space-separated datetime like 'YYYY-MM-DD HH:MM:SS', convert to 'YYYY-MM-DDTHH:MM:SSZ'
  if(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)){
    return new Date(s.replace(' ','T')+'Z')
  }
  // fallback
  return new Date(s)
}

function formatLocal(ts){
  const d = parseTimestamp(ts)
  if(!d || isNaN(d.getTime())) return 'invalid'
  // Format in Finland time (Europe/Helsinki)
  try{
    return d.toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' })
  }catch(e){
    return d.toLocaleString()
  }
}

async function loadData(){
  const [statusRes, logsRes, rankingRes] = await Promise.all([
    fetch('/api/status'),
    fetch('/api/logs'),
    fetch('/api/ranking')
  ])

  const bins = await statusRes.json()
  const logs = await logsRes.json()
  const ranking = await rankingRes.json()

  // check admin status so we know whether to show usernames
  await checkAdmin()

  // cache logs for CSV export and filtering
  logsCache = logs

  // Build data for last-empty chart
  const labels = bins.map(b=>`Bin ${b.id}`)
  const minutes = bins.map(b=>{
    const m = minutesAgo(b.last)
    return m === null ? null : m
  })

  const bgColors = bins.map(b=>colorByRecency(b.last))

  // Destroy previous charts
  if(chartLast) chartLast.destroy()
  if(chartEmpties) chartEmpties.destroy()

  // Keep original minutes for tooltips, but cap displayed values to 240 so the chart stays usable.
  const originalMinutes = minutes.slice()
  const displayMinutes = minutes.map(m => (m === null ? 240 : Math.min(m, 240)))

  // create an overlay dataset to mark capped bars (originalMinutes > 240)
  const cappedData = originalMinutes.map(m => (m !== null && m > 240) ? 240 : null)

  chartLast = new Chart(ctxLast, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Minutes since last empty',
        data: displayMinutes,
        backgroundColor: bgColors
      },
      // overlay line dataset used only to draw a top marker for capped bars
      {
        type: 'line',
        label: 'capped-markers',
        data: cappedData,
        borderColor: 'rgba(0,0,0,0)',
        backgroundColor: '#000',
        pointStyle: 'triangle',
        pointRadius: 7,
        pointHoverRadius: 9,
        tension: 0,
        spanGaps: true,
        showLine: false,
        order: 2
      }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 240, ticks: { stepSize: 30 } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context){
              const idx = context.dataIndex
              const real = originalMinutes[idx]
              if(real === null) return 'Last empty: never'
              if(real > 240) return `Last empty: ${real} min (>=240 shown)`
              return `Last empty: ${real} min`
            }
          }
        }
      },
      plugins: { legend: { display: false } }
    }
  })

  // Empties per bin chart
  const rankLabels = ranking.map(r=>`Bin ${r.bin_id}`)
  const rankValues = ranking.map(r=>r.total)

  chartEmpties = new Chart(ctxEmpties, {
    type: 'bar',
    data: { labels: rankLabels, datasets: [{ label: 'Empties', data: rankValues, backgroundColor: '#3498db' }] },
    options: { responsive:true, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true } } }
  })

  // Populate sidebar list and logs
  binsList.innerHTML = ''
  const emptiesMap = {}
  ranking.forEach(r=>{ emptiesMap[r.bin_id] = r.total })

  bins.sort((a,b)=>{
    const ta = a.last ? parseTimestamp(a.last).getTime() : 0
    const tb = b.last ? parseTimestamp(b.last).getTime() : 0
    return tb - ta
  })

  bins.forEach(b=>{
    const row = document.createElement('div')
    row.className = 'bin-row'
    const lastDisplay = b.last ? `${niceTimeAgo(b.last)} (${formatLocal(b.last)})` : 'never'
    row.innerHTML = `<strong>Bin ${b.id}</strong> — Last: ${lastDisplay} — Empties: ${emptiesMap[b.id] || 0}`
  row.addEventListener('click', ()=>{
      // highlight the bar in chartLast
      const idx = bins.findIndex(x=>x.id===b.id)
      if(idx>=0){
        chartLast.setActiveElements([{datasetIndex:0,index:idx}])
        chartLast.update()
      }
      // apply filter and render logs
      currentFilterBin = b.id
      document.getElementById('currentFilter').innerText = `Bin ${b.id}`
      renderLogs()
    })
    binsList.appendChild(row)
  })
  // update lastUpdated
  const lastUpdated = document.getElementById('lastUpdated')
  if(lastUpdated) lastUpdated.innerText = `Updated ${new Date().toLocaleTimeString()}`

  // CSV download handler
  const downloadBtn = document.getElementById('downloadCsv')
  if(downloadBtn) downloadBtn.onclick = ()=>{
    const rows = [['bin_id','last_timestamp','minutes_ago','empties']]
    bins.forEach(b=>{
      rows.push([b.id, b.last || '', minutesAgo(b.last), emptiesMap[b.id] || 0])
    })
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bin_times_${new Date().toISOString().slice(0,19)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Download logs CSV (all or filtered)
  const downloadLogsBtn = document.getElementById('downloadLogsCsv')
  if(downloadLogsBtn) downloadLogsBtn.onclick = ()=>{
    const rows = [['id','username','bin_id','timestamp']]
    const data = currentFilterBin ? logsCache.filter(l=>String(l.bin_id)===String(currentFilterBin)) : logsCache
    data.forEach(l=> rows.push([l.id, (isAdmin ? l.username : '*****'), l.bin_id, l.timestamp]))
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs_${currentFilterBin?('bin_'+currentFilterBin+'_') : ''}${new Date().toISOString().slice(0,19)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Clear filter button
  const clearBtn = document.getElementById('clearFilter')
  if(clearBtn) clearBtn.onclick = ()=>{
    currentFilterBin = null
    document.getElementById('currentFilter').innerText = '(none)'
    renderLogs()
  }

  // Print button
  const printBtn = document.getElementById('printBtn')
  if(printBtn) printBtn.onclick = ()=> window.print()

  // add chart click handlers to filter logs
  if(chartLast && chartLast.canvas){
    chartLast.canvas.onclick = function(evt){
      const points = chartLast.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true)
      if(points.length){
        const idx = points[0].index
        const label = chartLast.data.labels[idx]
        const id = label.split(' ')[1]
        currentFilterBin = id
        document.getElementById('currentFilter').innerText = `Bin ${id}`
        renderLogs()
      }
    }
  }

  if(chartEmpties && chartEmpties.canvas){
    chartEmpties.canvas.onclick = function(evt){
      const points = chartEmpties.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true)
      if(points.length){
        const idx = points[0].index
        const label = chartEmpties.data.labels[idx]
        const id = label.split(' ')[1]
        currentFilterBin = id
        document.getElementById('currentFilter').innerText = `Bin ${id}`
        renderLogs()
      }
    }
  }

  // initial render of logs (no filter)
  renderLogs()
}

function renderLogs(){
  logsDiv.innerHTML = ''
  const data = currentFilterBin ? logsCache.filter(l=>String(l.bin_id)===String(currentFilterBin)) : logsCache
  if(data.length === 0){ logsDiv.innerText = 'No logs' ; return }
  data.slice(0,200).forEach(l=>{
    const r = document.createElement('div')
    r.className = 'bin-row'
    const shownUser = isAdmin ? l.username : '*****'
    const local = formatLocal(l.timestamp)
    r.innerText = `${local} — ${shownUser} — Bin ${l.bin_id}`
    logsDiv.appendChild(r)
  })
}

async function checkAdmin(){
  try{
    const res = await fetch('/api/admin/check')
    if(res && res.ok){
      const js = await res.json()
      isAdmin = !!js.logged
    } else {
      isAdmin = false
    }
  }catch(e){
    isAdmin = false
  }
}

loadData()

// refresh periodically
setInterval(loadData, 60*1000)
