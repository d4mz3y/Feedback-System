// Demo-only shim for the static GitHub Pages copy. The real app posts to an
// Express/MongoDB backend that sends email; this build has no backend, so
// submissions are simulated and nothing is stored or sent.
(function () {
  var realFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    if (typeof url === 'string' && url.indexOf('/api/feedback') !== -1) {
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(new Response('{"demo":true}', { status: 200 })); }, 700);
      });
    }
    return realFetch(url, opts);
  };
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('div');
    bar.textContent = 'Live demo — submissions are simulated; nothing is stored or emailed.';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#111;color:#f5f5f5;font:500 13px Inter,sans-serif;text-align:center;padding:10px 16px;';
    document.body.appendChild(bar);
  });
})();
