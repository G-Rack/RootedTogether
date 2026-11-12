// The coming-soon page, as one self-contained HTML document. proxy.js sends it to every visitor
// while the site is locked, so none of the real site is loaded for them.
// Tapping the logo five times reveals a small box for the secret code (handled in /api/gate).

import { GOOGLE_TAG_ID, CONSENT_INIT, PIXELS_INIT, SIGNUP_LABEL, CONSENT_KEY } from './tracking';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const INSTAGRAM_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>';
const TIKTOK_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 2h-3.2v12.6a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V8.5a6.1 6.1 0 1 0 5.2 6.1V8.4a7.6 7.6 0 0 0 4.4 1.4V6.6A4.4 4.4 0 0 1 16.6 2z"/></svg>';
const IOS_SVG = '<svg width="28" height="32" viewBox="0 0 30 34" fill="none" aria-hidden="true"><rect x="5" y="2" width="20" height="30" rx="4.5" stroke="#fff" stroke-width="2.4"/><path d="M12 6h6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M15 12v10M10.8 18l4.2 4.2 4.2-4.2" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PLAY_SVG = '<svg width="28" height="32" viewBox="0 0 30 34" fill="none" aria-hidden="true"><path d="M5 3.8v26.4c0 1.4 1.5 2.2 2.7 1.5l20-13.2c1-.7 1-2.2 0-2.9L7.7 2.3C6.5 1.6 5 2.4 5 3.8z" fill="#fff"/></svg>';

// variant 'seeker' (rootedtogether.club): leads with the free daily devotional; the button itself is
// the consent to receive it. variant 'creator' (joinrootedtogether.club): "Request an invitation",
// with an optional devotional tickbox that starts off.
export function comingSoonHtml({ blurb, social = {}, privacyHref = '/privacy', variant = 'creator' }) {
  const year = new Date().getFullYear();
  const seeker = variant === 'seeker';
  const links = [
    social.instagram && `<a href="${esc(social.instagram)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">${INSTAGRAM_SVG}</a>`,
    social.tiktok && `<a href="${esc(social.tiktok)}" target="_blank" rel="noopener noreferrer" aria-label="TikTok">${TIKTOK_SVG}</a>`,
  ].filter(Boolean);
  const socialRow = links.length
    ? `<div class="social"><span>Follow along</span><div>${links.join('')}</div></div>`
    : '';

  const googleHead = GOOGLE_TAG_ID
    ? `<script>${CONSENT_INIT}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}"></script>
<script>gtag('js',new Date());gtag('config','${GOOGLE_TAG_ID}',{linker:{domains:['rootedtogether.club','joinrootedtogether.club']}});</script>`
    : '';
  const consentBar = GOOGLE_TAG_ID
    ? `<div id="consent" role="dialog" aria-label="Cookie choices" hidden><p>We use cookies to measure how our adverts perform. You can say no and everything still works. <a href="${esc(privacyHref)}">Privacy Policy</a></p><div><button type="button" id="consentNo" class="c-no">Decline</button><button type="button" id="consentYes" class="c-yes">Allow</button></div></div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rooted Together | Coming soon, by invitation</title>
<meta name="description" content="Rooted Together is coming soon, by invitation. A faith-based mentorship community on iOS, Android and the web.">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#FBF6EF">
<meta property="og:title" content="Rooted Together | Coming soon, by invitation">
<meta property="og:description" content="A faith-based mentorship community. Coming soon, by invitation.">
<meta property="og:type" content="website">
<meta property="og:image" content="/icon.png">
<meta name="twitter:card" content="summary">
${googleHead}
<script>${PIXELS_INIT}</script>
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
.rule{width:150px;height:2px;margin:22px auto 0;border-radius:2px;background:var(--gold)}
h1{margin:26px 0 0;font-size:clamp(30px,6.6vw,46px);line-height:1.12;font-weight:600;color:var(--brown);letter-spacing:-.5px}
h1 .dot{color:var(--gold)}
.blurb{margin:18px auto 0;max-width:520px;font-size:16.5px;line-height:1.65;color:var(--soft)}
.verse{margin:38px 0 0;max-width:520px;font-size:17px;font-style:italic;color:var(--brown);line-height:1.55}
.verse small{display:block;margin-top:6px;font-family:Inter,sans-serif;font-style:normal;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}
.badges{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:30px}
.badge{display:flex;align-items:center;gap:12px;padding:11px 20px 11px 16px;border-radius:14px;background:var(--brown);color:#fff;text-align:left;line-height:1.1;box-shadow:0 8px 20px rgba(107,66,38,.22)}
.badge span{display:block;font-size:12.5px;letter-spacing:.2px;opacity:.9}
.badge b{display:block;font-size:21px;font-weight:600;letter-spacing:-.3px;margin-top:3px}
.notify{margin-top:30px;width:100%;max-width:500px}
.notify p{margin:0 0 12px;font-size:15px;color:var(--soft)}
.row{display:flex;gap:8px}
.row input{flex:1;min-width:0;padding:14px 16px;border-radius:12px;border:1.5px solid var(--border);background:#fff;font:inherit;font-size:15px;color:var(--dark);outline:none}
.row input:focus{border-color:var(--brown)}
.row button{padding:0 24px;border:0;border-radius:12px;background:var(--brown);color:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap}
.row button:disabled{opacity:.6;cursor:default}
.opt{display:flex;align-items:center;justify-content:center;gap:9px;margin-top:14px;font-size:14px;color:var(--soft);cursor:pointer;text-align:left}
.opt input{width:18px;height:18px;accent-color:var(--brown);flex:none}
h1.seek{font-size:clamp(28px,5.6vw,40px);line-height:1.18;max-width:600px}
.fine{margin:12px auto 0;max-width:460px;font-size:12.5px;line-height:1.55;color:var(--soft)}
.fine a{color:var(--brown);text-decoration:underline}
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
#consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:720px;margin:0 auto;background:var(--cream);border:1px solid var(--border);border-radius:18px;box-shadow:0 12px 36px rgba(46,27,16,.22);padding:16px 18px;display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;text-align:left}
#consent[hidden]{display:none}
#consent p{margin:0;flex:1 1 320px;font-size:14px;line-height:1.55;color:var(--soft)}
#consent a,footer a{color:var(--brown);text-decoration:underline}
#consent div{display:flex;gap:8px}
#consent button{padding:10px 18px;border-radius:999px;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.c-no{background:#fff;color:var(--brown);border:1.5px solid var(--border)}
.c-yes{background:var(--brown);color:#fff;border:1.5px solid var(--brown)}
@media (max-width:480px){.row{flex-direction:column}.row button{padding:14px}.badge b{font-size:19px}}
</style>
</head>
<body>
<main>
  <div id="logo" role="img" aria-label="Rooted Together">
    <img src="/icon.png" alt="" width="92" height="92">
    <div class="word serif">Rooted Together</div>
  </div>

  <div class="rule" aria-hidden="true"></div>
  ${seeker
    ? '<h1 class="serif seek">A free daily devotional, in your inbox each morning.</h1>\n  <p class="blurb">And your invitation when Rooted Together opens. Coming soon, by invitation.</p>'
    : `<h1 class="serif">Coming soon <span class="dot">&middot;</span> by invitation</h1>\n  <p class="blurb">${esc(blurb)}</p>`}

  <form class="notify" id="notify" novalidate>
    ${seeker ? '' : '<p>Leave your email and we will send your invitation when the doors open.</p>'}
    <div class="row">
      <input type="email" id="email" name="email" placeholder="you@example.com" autocomplete="email" aria-label="Email address" required>
      <input class="hp" type="text" id="website" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button type="submit" id="notifyBtn">${seeker ? 'Send me the devotional' : 'Request an invitation'}</button>
    </div>
    ${seeker
      ? `<p class="fine">By clicking, you agree to receive our free daily devotional by email, and your invitation when we open. Unsubscribe any time. <a href="${esc(privacyHref)}">Privacy Policy</a></p>`
      : '<label class="opt"><input type="checkbox" id="devotional" name="devotional"><span>Send me the daily devotional</span></label>'}
    <div class="msg" id="notifyMsg" role="status" aria-live="polite"></div>
  </form>

  <p class="verse serif">&ldquo;The LORD bless thee, and keep thee: the LORD make his face shine upon thee, and be gracious unto thee: the LORD lift up his countenance upon thee, and give thee peace.&rdquo;<small>Numbers 6:24&ndash;26</small></p>

  <div class="badges">
    <div class="badge">${IOS_SVG}<div><span>Coming soon on the</span><b>App Store</b></div></div>
    <div class="badge">${PLAY_SVG}<div><span>Coming soon on</span><b>Google Play</b></div></div>
  </div>

  ${socialRow}

  <form id="gate" novalidate>
    <div class="row">
      <input type="password" id="code" placeholder="Access code" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Access code">
      <button type="submit" id="gateBtn">Enter</button>
    </div>
    <div class="msg err" id="gateMsg" role="status" aria-live="polite"></div>
  </form>

  <footer>&copy; ${year} Rooted Together, Inc. &middot; <a href="${esc(privacyHref)}">Privacy Policy</a></footer>
  ${consentBar}
</main>
<script>
(function () {
  var logo = document.getElementById('logo'), gate = document.getElementById('gate'), code = document.getElementById('code');
  var taps = 0, timer = null;
  var utm = '', utmCamp = '';
  try {
    var params = new URLSearchParams(window.location.search);
    var q = params.get('utm_source'), qc = params.get('utm_campaign');
    if (q) { utm = q.slice(0, 100); window.sessionStorage.setItem('rt_utm_source', utm); }
    else { utm = window.sessionStorage.getItem('rt_utm_source') || ''; }
    if (qc) { utmCamp = qc.slice(0, 100); window.sessionStorage.setItem('rt_utm_campaign', utmCamp); }
    else { utmCamp = window.sessionStorage.getItem('rt_utm_campaign') || ''; }
  } catch (e) {}
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

  function track() {
    if (window.rtTrackSignup) window.rtTrackSignup();
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', 'sign_up', { method: 'waitlist' });
    ${SIGNUP_LABEL ? `window.gtag('event', 'conversion', { send_to: '${GOOGLE_TAG_ID}/${SIGNUP_LABEL}' });` : ''}
  }
  var bar = document.getElementById('consent');
  if (bar && window.__rtAskConsent) {
    bar.hidden = false;
    var choose = function (granted) {
      var v = granted ? 'granted' : 'denied';
      try { window.localStorage.setItem('${CONSENT_KEY}', v); } catch (e) {}
      window.gtag('consent', 'update', { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v });
      if (granted && window.rtLoadPixels) window.rtLoadPixels();
      bar.hidden = true;
    };
    document.getElementById('consentNo').addEventListener('click', function () { choose(false); });
    document.getElementById('consentYes').addEventListener('click', function () { choose(true); });
  }

  document.getElementById('notify').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = document.getElementById('notifyBtn'), msg = document.getElementById('notifyMsg'), email = document.getElementById('email');
    msg.className = 'msg'; msg.textContent = '';
    btn.disabled = true;
    var tick = document.getElementById('devotional');
    post('/api/waitlist', { email: email.value, website: document.getElementById('website').value, utm_source: utm, utm_campaign: utmCamp, devotional: ${seeker ? 'true' : 'tick ? tick.checked : false'} }).then(function (j) {
      btn.disabled = false;
      if (j.ok && j.duplicate) { msg.className = 'msg ok'; msg.textContent = 'You are already on our list. We will be in touch.'; email.value = ''; }
      else if (j.ok) {
        if (j.saved) track();
        if (tick) tick.checked = false;
        msg.className = 'msg ok';
        msg.textContent = ${seeker ? "'Thank you. You are on the list for the daily devotional and your invitation.'" : "'Thank you. Your request is in. We will email your invitation when we open.'"};
        email.value = '';
      }
      else { msg.className = 'msg err'; msg.textContent = j.error || 'Something went wrong. Please try again.'; }
    }).catch(function () { btn.disabled = false; msg.className = 'msg err'; msg.textContent = 'Something went wrong. Please try again.'; });
  });
})();
</script>
</body>
</html>`;
}
