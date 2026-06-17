import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ue_pin_ok";

const GATE_HTML = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="robots" content="noindex,nofollow" />
<title>Designer Leads — Access</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%23171717'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='18' fill='%233ecf8e'>U</text></svg>" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap" />
<style>
  :root,[data-theme="dark"]{
    --color-black:#0f0f0f;--color-page:#171717;--color-surface:#1c1c1c;--color-elevated:#212121;
    --color-surface-hover:#242424;--color-border-subtle:#242424;--color-border:#2e2e2e;
    --color-border-prominent:#363636;--color-border-light:#393939;--color-text-primary:#fafafa;
    --color-text-secondary:#b4b4b4;--color-text-muted:#898989;--color-text-dim:#4d4d4d;
    --color-green:#3ecf8e;--color-green-link:#00c573;--color-green-border:rgba(62,207,142,.3);
    --color-green-bg:rgba(62,207,142,.08);--color-crimson:hsl(354,100%,66%);
    --radius-sm:6px;--radius-md:8px;--radius-lg:16px;--radius-pill:9999px;
    --font-sans:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    --font-mono:"Source Code Pro",ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;height:100%}
  body{
    background:radial-gradient(1200px 600px at 50% -10%,rgba(62,207,142,.06),transparent 60%),var(--color-page);
    color:var(--color-text-primary);font-family:var(--font-sans);font-weight:400;
    -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;line-height:1.5;
    min-height:100%;display:grid;place-items:center;padding:24px;
  }
  .grain{position:fixed;inset:0;pointer-events:none;opacity:.03;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");mix-blend-mode:overlay}
  .wrap{position:relative;width:100%;max-width:380px}
  .topbar{
    display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;
    padding:0 4px;
  }
  .brand{display:flex;align-items:center;gap:10px}
  .mark{
    width:22px;height:22px;border-radius:6px;background:var(--color-page);
    display:grid;place-items:center;border:1px solid var(--color-border);
    font-family:var(--font-sans);font-weight:600;font-size:13px;color:var(--color-green);
  }
  .brandname{font-size:13px;font-weight:500;color:var(--color-text-primary);letter-spacing:-.005em}
  .brandname .dot{color:var(--color-text-dim);margin:0 6px;font-weight:400}
  .brandname .sub{color:var(--color-text-muted);font-weight:400}
  .mono-label{font-family:var(--font-mono);font-size:.6875rem;font-weight:500;text-transform:uppercase;letter-spacing:.085em;color:var(--color-text-muted)}
  .card{
    position:relative;background:var(--color-surface);border:1px solid var(--color-border);
    border-radius:var(--radius-lg);padding:28px 24px 24px;
    box-shadow:0 1px 0 rgba(255,255,255,.02) inset, 0 30px 60px -20px rgba(0,0,0,.6);
  }
  .corner{position:absolute;top:0;left:24px;height:1px;width:36px;background:linear-gradient(90deg,transparent,var(--color-green) 50%,transparent);opacity:.8}
  h1{font-size:18px;font-weight:600;margin:4px 0 4px;letter-spacing:-.01em;color:var(--color-text-primary)}
  p.lede{margin:0 0 22px;font-size:13px;color:var(--color-text-secondary);line-height:1.55}
  .pinrow{display:flex;gap:10px;justify-content:center;margin:8px 0 18px}
  .pinrow .slot{
    width:54px;height:64px;border-radius:var(--radius-md);background:var(--color-black);
    border:1px solid var(--color-border);display:grid;place-items:center;
    font-family:var(--font-mono);font-size:26px;color:var(--color-text-primary);
    transition:border-color .15s ease, transform .12s ease, background .15s ease;
  }
  .pinrow .slot.filled{background:var(--color-elevated);border-color:var(--color-border-prominent)}
  .pinrow .slot.active{border-color:var(--color-green);box-shadow:0 0 0 3px var(--color-green-bg)}
  .pinrow.shake .slot{border-color:var(--color-crimson);animation:shake .35s ease}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
  input[type="password"]{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
  .err{
    min-height:18px;margin:0 0 6px;text-align:center;font-size:12px;color:var(--color-crimson);
    font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.08em;opacity:0;transition:opacity .15s ease;
  }
  .err.show{opacity:1}
  .submit{
    width:100%;height:42px;border-radius:var(--radius-md);border:1px solid transparent;
    background:var(--color-green);color:var(--color-black);font-weight:600;font-size:13px;
    cursor:pointer;letter-spacing:-.005em;transition:filter .15s ease, transform .08s ease;
  }
  .submit:hover{filter:brightness(1.05)}
  .submit:active{transform:translateY(1px)}
  .submit:disabled{opacity:.5;cursor:not-allowed}
  .meta{
    display:flex;align-items:center;justify-content:space-between;margin-top:18px;
    padding-top:14px;border-top:1px solid var(--color-border-subtle);
  }
  .meta .left,.meta .right{font-family:var(--font-mono);font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--color-text-muted)}
  .meta .right{display:flex;align-items:center;gap:6px}
  .pulse{width:6px;height:6px;border-radius:9999px;background:var(--color-green);box-shadow:0 0 8px var(--color-green);animation:pulse 2.4s ease-in-out infinite}
  @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
  .keypad{
    display:none;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px;
  }
  @media (max-width:480px){
    .keypad{display:grid}
    .pinrow .slot{width:46px;height:56px;font-size:22px}
  }
  .key{
    height:48px;border-radius:var(--radius-md);background:var(--color-elevated);
    border:1px solid var(--color-border);color:var(--color-text-primary);
    font-family:var(--font-mono);font-size:18px;cursor:pointer;
    transition:background .1s ease,border-color .1s ease;
  }
  .key:active{background:var(--color-surface-hover);border-color:var(--color-border-prominent)}
  .key.zero{grid-column:1}
  .key.back{background:transparent;color:var(--color-text-muted);font-size:14px}
  .key.go{background:var(--color-green);color:var(--color-black);font-weight:600;border-color:transparent}
  .key.go:disabled{opacity:.4}
</style>
</head>
<body>
<div class="grain"></div>
<div class="wrap">
  <div class="topbar">
    <div class="brand">
      <div class="mark">U</div>
      <div class="brandname">unreal.ae <span class="dot">/</span> <span class="sub">designer leads</span></div>
    </div>
    <div class="mono-label">v 24.x</div>
  </div>

  <div class="card">
    <div class="corner"></div>
    <div class="mono-label" style="margin-bottom:14px">Restricted Access</div>
    <h1>Enter access PIN</h1>
    <p class="lede">This dashboard is private. Punch in the 4-digit code to continue.</p>

    <form method="post" action="/api/unlock" id="f">
      <div class="pinrow" id="dots" aria-hidden="true">
        <div class="slot" data-i="0"></div>
        <div class="slot" data-i="1"></div>
        <div class="slot" data-i="2"></div>
        <div class="slot" data-i="3"></div>
      </div>
      <input type="password" name="pin" id="pin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" autofocus aria-label="Access PIN" />

      <div class="err" id="err">Invalid PIN</div>

      <button type="submit" class="submit" id="go">Unlock</button>

      <div class="keypad" id="kp">
        <button type="button" class="key" data-k="1">1</button>
        <button type="button" class="key" data-k="2">2</button>
        <button type="button" class="key" data-k="3">3</button>
        <button type="button" class="key" data-k="4">4</button>
        <button type="button" class="key" data-k="5">5</button>
        <button type="button" class="key" data-k="6">6</button>
        <button type="button" class="key" data-k="7">7</button>
        <button type="button" class="key" data-k="8">8</button>
        <button type="button" class="key" data-k="9">9</button>
        <button type="button" class="key zero" data-k="0">0</button>
        <button type="button" class="key back" id="bk" aria-label="Backspace">DEL</button>
        <button type="button" class="key go" id="kg" aria-label="Unlock">↵</button>
      </div>
    </form>

    <div class="meta">
      <div class="left">UAE / Dubai</div>
      <div class="right"><span class="pulse"></span> Online</div>
    </div>
  </div>
</div>

<script>
  (function(){
    var pin = document.getElementById('pin');
    var dots = document.querySelectorAll('#dots .slot');
    var err = document.getElementById('err');
    var f = document.getElementById('f');
    var go = document.getElementById('go');
    var kp = document.getElementById('kp');

    function render(){
      var v = pin.value;
      dots.forEach(function(s,i){
        s.classList.toggle('filled', i < v.length);
        s.classList.toggle('active', i === v.length);
        s.textContent = v[i] ? '•' : '';
      });
      go.disabled = v.length !== 4;
    }

    function press(k){
      if (k === 'DEL') { pin.value = pin.value.slice(0,-1); }
      else if (k === 'GO') { if (!go.disabled) f.submit(); return; }
      else if (pin.value.length < 4) { pin.value += k; }
      render();
      if (pin.value.length === 4) { setTimeout(function(){ f.submit(); }, 120); }
    }

    pin.addEventListener('input', function(){
      pin.value = pin.value.replace(/\\D/g,'').slice(0,4);
      err.classList.remove('show');
      document.getElementById('dots').classList.remove('shake');
      render();
    });
    pin.addEventListener('keydown', function(e){
      if (e.key === 'Enter') { if (!go.disabled) f.submit(); }
    });

    kp.addEventListener('click', function(e){
      var b = e.target.closest('.key');
      if (!b) return;
      press(b.dataset.k);
    });

    // Show error if ?err=1 in URL (set by /api/unlock on bad PIN)
    try {
      var u = new URL(location.href);
      if (u.searchParams.get('err') === '1') {
        err.classList.add('show');
        document.getElementById('dots').classList.add('shake');
        // remove the param so a refresh is clean
        history.replaceState({}, '', location.pathname);
      }
    } catch(_){}

    render();
    // Focus even if browser stole focus
    setTimeout(function(){ try { pin.focus(); } catch(_){} }, 50);
  })();
</script>
</body>
</html>`;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow unlock endpoint, scanner APIs, and Next internals via matcher too,
  // but double-check here in case the matcher evolves.
  if (pathname === "/api/unlock") return NextResponse.next();
  if (pathname.startsWith("/api/leads")) return NextResponse.next();
  if (pathname.startsWith("/api/scans")) return NextResponse.next();
  if (pathname.startsWith("/api/outreach")) return NextResponse.next();
  if (pathname.startsWith("/api/profiles")) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie && cookie.value === "1") return NextResponse.next();

  // Show the styled gate
  return new NextResponse(GATE_HTML, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
