// Register a simple service worker if available
if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('/sw.js').then(function(reg){
      console.log('ServiceWorker registered', reg.scope)
    }).catch(function(err){
      console.warn('ServiceWorker registration failed', err)
    })
  })
}
