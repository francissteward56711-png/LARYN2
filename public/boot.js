// Keep useful content visible if the main JavaScript cannot load or start.
;(function () {
  var lastFailure = null
  function showFailure(message, detail) {
    lastFailure = { message: message, detail: detail }
    var card = document.querySelector('[data-laryn-startup]')
    if (!card) return
    document.getElementById('startup-title').textContent = 'LARYN could not start'
    document.getElementById('startup-message').textContent = message
    document.getElementById('startup-detail').textContent = String(detail || '').slice(0, 600)
    document.getElementById('startup-diagnostics').hidden = false
  }
  window.addEventListener(
    'error',
    function (event) {
      if (event.target && event.target.tagName === 'SCRIPT') {
        showFailure(
          'A required app file could not be downloaded. Check your connection and reload. If this continues, upload the complete website folder to your hosting service.',
          event.target.src,
        )
      } else if (event.message) {
        showFailure(
          'Your browser reported a startup error. Try reloading. If it happens again, share the error details below so we can fix it.',
          event.message,
        )
      }
    },
    true,
  )
  window.addEventListener('unhandledrejection', function (event) {
    showFailure(
      'The app could not finish loading. Try reloading while online. If it happens again, share the error details below.',
      event.reason && event.reason.message ? event.reason.message : String(event.reason),
    )
  })
  function initialize() {
    var retry = document.getElementById('startup-retry')
    if (retry)
      retry.addEventListener('click', function () {
        window.location.reload()
      })
    if (lastFailure) showFailure(lastFailure.message, lastFailure.detail)
    window.setTimeout(function () {
      if (document.querySelector('[data-laryn-startup]') && !lastFailure) {
        document.getElementById('startup-title').textContent = 'Still loading LARYN'
        document.getElementById('startup-message').textContent =
          'Loading is taking longer than expected. Check your connection and reload. If it stays here, send us a screenshot.'
      }
    }, 10000)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize)
  else initialize()
})()
