// GET /confidentialite (reecrit vers /api/privacy par vercel.json)
// Politique de confidentialite de l'extension, demandee par le Chrome Web Store.
const HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Confidentialité — TVABDOU Live Tracker</title>
<style>
  :root { --bg:#f4f2fb; --surface:#fff; --ink:#17151f; --muted:#6b6780; --lav:#c9bcf1; --mint:#b9e2ce; --deep:#8b6fd6; --border:#e4dcf7; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0e0b18; --surface:#17131f; --ink:#ebe9f3; --muted:#a29db5; --deep:#c9bcf1; --border:#2a2438; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.6 "Segoe UI", Roboto, Arial, sans-serif; }
  header { background:linear-gradient(120deg, var(--lav), var(--mint)); color:#17151f; padding:36px 16px 30px; }
  header .wrap, main { max-width:720px; margin:0 auto; }
  h1 { margin:0 0 4px; font-size:26px; line-height:1.2; }
  header p { margin:0; opacity:.8; }
  main { padding:24px 16px 48px; }
  section { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:18px 20px; margin-bottom:14px; }
  h2 { margin:0 0 8px; font-size:17px; color:var(--deep); }
  ul { margin:6px 0 0; padding-left:20px; }
  p { margin:6px 0; }
  a { color:var(--deep); }
  .muted { color:var(--muted); font-size:14px; }
</style>
</head>
<body>
<header><div class="wrap">
  <h1>Politique de confidentialité</h1>
  <p>Extension « TVABDOU — Live Tracker » · mise à jour le 28 octobre 2026</p>
</div></header>
<main>
  <section>
    <h2>En bref</h2>
    <p>L'extension ne collecte <b>aucune donnée personnelle</b>. Elle ne contient ni publicité,
    ni pistage, ni compte à créer, et rien n'est vendu ni partagé.</p>
  </section>
  <section>
    <h2>Ce qui reste sur ton ordinateur</h2>
    <p>Pour fonctionner, l'extension garde quelques informations dans le stockage local du navigateur.
    Elles ne quittent jamais ton appareil :</p>
    <ul>
      <li>ton choix d'activer ou de couper les notifications ;</li>
      <li>le dernier live, la dernière vidéo et la dernière publication déjà vus, pour ne pas te notifier deux fois ;</li>
      <li>une copie de la liste des liens et des chaînes suivies.</li>
    </ul>
    <p>Désinstaller l'extension efface tout.</p>
  </section>
  <section>
    <h2>Ce que l'extension télécharge</h2>
    <ul>
      <li>Des informations <b>publiques</b> sur TVABDOU (statut du live, rediffusions, vidéos YouTube,
      titres des publications Patreon) depuis notre serveur <code>extension-tvabdou.vercel.app</code>.
      La requête ne contient aucune information sur toi.</li>
      <li>Les miniatures et photos de profil, chargées directement depuis Twitch, YouTube et Patreon.</li>
      <li>Le planning, affiché depuis <code>planning-live.vercel.app</code>.</li>
    </ul>
    <p class="muted">Comme tout site web, l'hébergeur (Vercel) peut tenir des journaux techniques
    temporaires (par exemple l'adresse IP d'une requête) pour la sécurité et le bon fonctionnement du service.
    Nous ne les utilisons pas pour t'identifier.</p>
  </section>
  <section>
    <h2>Permissions demandées</h2>
    <ul>
      <li><b>Notifications</b> : te prévenir quand le live commence ou qu'une vidéo ou une publication sort.</li>
      <li><b>Stockage</b> : garder les informations locales décrites plus haut.</li>
      <li><b>Alarmes</b> : vérifier régulièrement si le live a commencé.</li>
      <li><b>Accès à extension-tvabdou.vercel.app</b> : récupérer les informations publiques ci-dessus.</li>
    </ul>
  </section>
  <section>
    <h2>Contact</h2>
    <p>Une question ? Passe par le <a href="https://discord.com/invite/SuN3YSHjAC">Discord de TVABDOU</a>.</p>
  </section>
</main>
</body>
</html>`;

export default function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).send(HTML);
}
