// Petite page HTML aux couleurs TVABDOU (lavande / menthe), claire ou sombre selon le systeme.
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function page({ title, icon = "", heading, body = "", button = null }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>
  :root { --bg:#f4f2fb; --surface:#fff; --ink:#17151f; --muted:#6b6780; --lav:#c9bcf1; --mint:#b9e2ce; --deep:#8b6fd6; --border:#e4dcf7; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0e0b18; --surface:#17131f; --ink:#ebe9f3; --muted:#a29db5; --deep:#c9bcf1; --border:#2a2438; }
  }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px 16px;
         background:var(--bg); color:var(--ink); font:16px/1.55 "Segoe UI", Roboto, Arial, sans-serif; }
  .card { width:100%; max-width:480px; background:var(--surface); border:1px solid var(--border);
          border-radius:20px; overflow:hidden; box-shadow:0 12px 32px rgba(80,60,140,.14); }
  .top { background:linear-gradient(120deg, var(--lav), var(--mint)); color:#17151f; padding:22px 24px; }
  .top .icon { font-size:34px; line-height:1; }
  .top h1 { margin:10px 0 0; font-size:21px; line-height:1.25; }
  .content { padding:20px 24px 24px; }
  .content p { margin:0 0 10px; }
  .muted { color:var(--muted); font-size:14px; }
  form { margin:14px 0 0; }
  label { display:block; font-weight:700; font-size:14px; margin:10px 0 4px; }
  input[type=text], input[type=url] { width:100%; padding:10px 12px; border-radius:10px; border:1px solid var(--border);
          background:var(--bg); color:var(--ink); font:inherit; }
  .hint { color:var(--muted); font-size:13px; margin-top:4px; }
  button { margin-top:14px; width:100%; padding:12px 16px; border:0; border-radius:12px; cursor:pointer;
           font:inherit; font-weight:800; color:#fff; background:linear-gradient(120deg, #8f74e0, #3fae7d); }
  button.stop { background:#17151f; }
  @media (prefers-color-scheme: dark) { button.stop { background:#ebe9f3; color:#17151f; } }
  .state { display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:12px; background:var(--bg);
           border:1px solid var(--border); font-weight:700; }
  .dot { width:10px; height:10px; border-radius:50%; background:#a29db5; flex:none; }
  .dot.on { background:#3fae7d; box-shadow:0 0 0 4px rgba(63,174,125,.25); }
  .foot { margin-top:16px; font-size:13px; color:var(--muted); }
  .foot a { color:var(--deep); }
  a.btn { display:inline-block; margin-top:8px; padding:11px 18px; border-radius:12px; text-decoration:none;
          font-weight:800; color:#fff; background:linear-gradient(120deg, #8f74e0, #3fae7d); }
</style>
</head>
<body>
  <main class="card">
    <div class="top"><div class="icon">${icon}</div><h1>${esc(heading)}</h1></div>
    <div class="content">${body}${button ? `<a class="btn" href="${esc(button.href)}">${esc(button.label)}</a>` : ""}</div>
  </main>
</body>
</html>`;
}

export { esc };
