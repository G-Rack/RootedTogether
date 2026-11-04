// The coming-soon page, as one self-contained HTML document. proxy.js sends it to every visitor
// while the site is locked, so none of the real site is loaded for them.
// Tapping the logo five times reveals a small box for the secret code (handled in /api/gate).

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const INSTAGRAM_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>';
const TIKTOK_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 2h-3.2v12.6a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V8.5a6.1 6.1 0 1 0 5.2 6.1V8.4a7.6 7.6 0 0 0 4.4 1.4V6.6A4.4 4.4 0 0 1 16.6 2z"/></svg>';
const IOS_SVG = '<svg width="28" height="32" viewBox="0 0 30 34" fill="none" aria-hidden="true"><rect x="5" y="2" width="20" height="30" rx="4.5" stroke="#fff" stroke-width="2.4"/><path d="M12 6h6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M15 12v10M10.8 18l4.2 4.2 4.2-4.2" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PLAY_SVG = '<svg width="28" height="32" viewBox="0 0 30 34" fill="none" aria-hidden="true"><path d="M5 3.8v26.4c0 1.4 1.5 2.2 2.7 1.5l20-13.2c1-.7 1-2.2 0-2.9L7.7 2.3C6.5 1.6 5 2.4 5 3.8z" fill="#fff"/></svg>';

export function comingSoonHtml({ blurb, social = {} }) {
  const year = new Date().getFullYear();
  const links = [
    social.instagram && `<a href="${esc(social.instagram)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">${INSTAGRAM_SVG}</a>`,
    social.tiktok && `<a href="${esc(social.tiktok)}" target="_blank" rel="noopener noreferrer" aria-label="TikTok">${TIKTOK_SVG}</a>`,
  ].filter(Boolean);
  const socialRow = links.length
    ? `<div class="social"><span>Follow along</span><div>${links.join('')}</div></div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rooted Together | Something special is coming soon</title>
<meta name="description" content="Something special is coming soon from Rooted Together. A faith-based mentorship community on iOS, Android and the web.">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#FBF6EF">
<meta property="og:title" content="Rooted Together | Something special is coming soon">
<meta property="og:description" content="A faith-based mentorship community. iOS and Android apps coming soon.">
<meta property="og:type" content="website">
<meta property="og:image" content="/icon.png">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/icon.png">
<link rel="apple-touch-icon" href="/apple-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap" rel="stylesheet">
<style>
:root{--cream:#FBF6EF;--brown:#6B4226;--dark:#2E1B10;--gold:#C8923F;--sand:#F1E4D3;--border:#EADBC8;--soft:#6F5846}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:var(--dark);background:var(--cream);
  background-image:radial-gradient(900px 480px at 50% -8%,rgba(200,146,63,.18),transparent 70%),radial-gradient(700px 420px at 100% 100%,rgba(107,66,38,.09),transparent 70%);
  min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 20px 28px;text-align:center;-webkit-font-smoothing:antialiased}
main{width:100%;max-width:640px;display:flex;flex-direction:column;align-items:center}
.serif{font-family:'Playfair Display',Georgia,serif}
#logo{display:flex;flex-direction:column;align-items:center;gap:14px;cursor:default;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none}
#logo img{width:92px;height:92px;border-radius:24px;box-shadow:0 14px 34px rgba(46,27,16,.2),0 0 0 1px rgba(107,66,38,.08)}
.word{font-size:25px;font-weight:700;color:var(--brown);letter-spacing:-.2px}
.eyebrow{margin-top:34px;font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}
h1{margin:12px 0 0;font-size:clamp(34px,7.4vw,54px);line-height:1.1;font-weight:700;color:var(--dark);letter-spacing:-.8px}
.blurb{margin:18px auto 0;max-width:520px;font-size:16.5px;line-height:1.65;color:var(--soft)}
.verse{margin:26px 0 0;font-size:17px;font-style:italic;color:var(--brown);line-height:1.55}
.verse small{display:block;margin-top:6px;font-family:Inter,sans-serif;font-style:normal;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}
.badges{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:36px}
.badge{display:flex;align-items:center;gap:12px;padding:11px 20px 11px 16px;border-radius:14px;background:var(--brown);color:#fff;text-align:left;line-height:1.1;box-shadow:0 8px 20px rgba(107,66,38,.22)}
.badge span{display:block;font-size:12.5px;letter-spacing:.2px;opacity:.9}
.badge b{display:block;font-size:21px;font-weight:600;letter-spacing:-.3px;margin-top:3px}
.notify{margin-top:40px;width:100%;max-width:440px}
.notify p{margin:0 0 12px;font-size:14.5px;color:var(--soft)}
.row{display:flex;gap:8px}
.row input{flex:1;min-width:0;padding:14px 16px;border-radius:12px;border:1.5px solid var(--border);background:#fff;font:inherit;font-size:15px;color:var(--dark);outline:none}
.row input:focus{border-color:var(--brown)}
.row button{padding:0 22px;border:0;border-radius:12px;background:var(--dark);color:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap}
.row button:disabled{opacity:.6;cursor:default}
.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.msg{min-height:20px;margin-top:10px;font-size:13.5px;color:var(--soft)}
.msg.ok{color:#4F6B3A;font-weight:600}
.msg.err{color:#A23B2A}
.social{margin-top:34px;display:flex;flex-direction:column;align-items:center;gap:10px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--soft)}
.social div{display:flex;gap:12px}
.social a{width:44px;height:44px;border-radius:50%;border:1.5px solid var(--border);background:#fff;color:var(--brown);display:inline-flex;align-items:center;justify-content:center;transition:transform .15s,border-color .15s}
.social a:hover{transform:translateY(-2px);border-color:var(--brown)}
#gate{display:none;margin-top:26px;width:100%;max-width:340px;animation:fade .25s ease}
#gate.open{display:block}
#gate .row input{text-align:center;letter-spacing:.06em}
#gate.shake{animation:shake .35s}
@keyframes fade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@keyframes shake{0%,100%{transform:none}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
footer{margin-top:44px;font-size:12.5px;color:var(--soft);opacity:.85}
@media (max-width:480px){.row{flex-direction:column}.row button{padding:14px}.badge b{font-size:19px}}
</style>
</head>
<body>
<main>
  <div id="logo" role="img" aria-label="Rooted Together">
    <img src="/icon.png" alt="" width="92" height="92">
    <div class="word serif">Rooted Together</div>
  </div>

  <div class="eyebrow">Launching soon</div>
  <h1 class="serif">Something special is coming soon.</h1>
  <p class="blurb">${esc(blurb)}</p>
  <p class="verse serif">&ldquo;Rooted and built up in him, and stablished in the faith.&rdquo;<small>Colossians 2:7</small></p>

  <div class="badges">
    <div class="badge">${IOS_SVG}<div><span>Coming soon on the</span><b>App Store</b></div></div>
    <div class="badge">${PLAY_SVG}<div><span>Coming soon on</span><b>Google Play</b></div></div>
  </div>

  <form class="notify" id="notify" novalidate>
    <p>Want a note the day we open? Leave your email.</p>
    <div class="row">
      <input type="email" id="email" name="email" placeholder="you@example.com" autocomplete="email" aria-label="Email address" required>
      <input class="hp" type="text" id="website" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button type="submit" id="notifyBtn">Notify me</button>
    </div>
    <div class="msg" id="notifyMsg" role="status" aria-live="polite"></div>
  </form>

  ${socialRow}

  <form id="gate" novalidate>
    <div class="row">
      <input type="password" id="code" placeholder="Access code" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Access code">
      <button type="submit" id="gateBtn">Enter</button>
    </div>
    <div class="msg err" id="gateMsg" role="status" aria-live="polite"></div>
  </form>

  <footer>&copy; ${year} Rooted Together, Inc.</footer>
</main>
<script>
(function () {
  var logo = document.getElementById('logo'), gate = document.getElementById('gate'), code = document.getElementById('code');
  var taps = 0, timer = null;
  logo.addEventListener('click', function () {
    taps += 1; clearTimeout(timer); timer = setTimeout(function () { taps = 0; }, 3500);
    if (taps >= 5) { taps = 0; gate.classList.add('open'); code.focus(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { gate.classList.remove('open'); code.value = ''; } });

  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); });
  }

  document.getElementById('gate').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = document.getElementById('gateBtn'), msg = document.getElementById('gateMsg');
    if (!code.value.trim()) return;
    btn.disabled = true; msg.textContent = '';
    post('/api/gate', { code: code.value }).then(function (j) {
      if (j.ok) { window.location.href = '/'; return; }
      btn.disabled = false; code.value = ''; msg.textContent = 'That is not it.';
      gate.classList.remove('shake'); void gate.offsetWidth; gate.classList.add('shake'); code.focus();
    }).catch(function () { btn.disabled = false; msg.textContent = 'Could not check the code. Try again.'; });
  });

  document.getElementById('notify').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = document.getElementById('notifyBtn'), msg = document.getElementById('notifyMsg'), email = document.getElementById('email');
    msg.className = 'msg'; msg.textContent = '';
    btn.disabled = true;
    post('/api/waitlist', { email: email.value, website: document.getElementById('website').value }).then(function (j) {
      btn.disabled = false;
      if (j.ok) { msg.className = 'msg ok'; msg.textContent = 'Thank you. We will email you when we open.'; email.value = ''; }
      else { msg.className = 'msg err'; msg.textContent = j.error || 'Something went wrong. Please try again.'; }
    }).catch(function () { btn.disabled = false; msg.className = 'msg err'; msg.textContent = 'Something went wrong. Please try again.'; });
  });
})();
</script>
</body>
</html>`;
}
