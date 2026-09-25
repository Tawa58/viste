;(function () {
  var params = new URLSearchParams(location.search)
  var target = params.get('url') || 'https://viste-sms.vercel.app'
  var reason = params.get('reason')
  if (reason) document.getElementById('reason').textContent = reason

  function retry() {
    location.href = target
  }
  document.getElementById('retry').addEventListener('click', retry)
  window.addEventListener('online', retry)
  setInterval(function () {
    if (navigator.onLine) retry()
  }, 30000)
})()
