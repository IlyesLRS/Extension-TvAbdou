# Proxy TVABDOU (Vercel)

Petit backend serverless qui garde les clés API Twitch/YouTube **côté serveur**.
L'extension appelle uniquement ce proxy, donc aucune clé n'est exposée.

## Interface de l'extension
- `GET /popup/` → **l'interface de l'extension** (dossier [`public/popup/`](public/popup/),
  servi tel quel grâce à `outputDirectory: "public"` dans [`vercel.json`](vercel.json)).
  La fenêtre de l'extension l'affiche dans un cadre : la modifier puis redéployer la met à
  jour pour tout le monde, sans réinstallation. Une copie du même dossier est embarquée dans
  le zip de l'extension et prend le relais si le serveur ne répond pas.

## Live Patreon
- `GET /live-patreon` → **page privée** pour signaler un live Patreon (titre et lien facultatifs,
  bouton « Fin du live », arrêt automatique après 12 h). Accès après connexion Patreon avec le
  compte propriétaire de la campagne TVABDOU (session de 12 h, cookie signé).
- L'état est rangé dans la table privée `public.ext_patreon_live` (Supabase reseaux-tvabdou) et
  renvoyé par `/api/status` dans `lives` (voir ci-dessous).
- **Enregistreur** : à chaque lecture des posts, les 5 derniers sont notés dans
  `public.ext_patreon_post_log` (tous les champs documentés, `live_on` = un live était signalé).
  Au prochain live, ce journal montrera à quoi ressemble un live dans l'API, pour ajouter la
  détection automatique. Purge après 90 jours (cron).

## Endpoints
- `GET /api/status` → `{ lives, live, stream, vods, vod }` — `lives` = lives en cours toutes
  plateformes (`[{ platform: "twitch" | "patreon", title, url, startedAt, ... }]`) ;
  `live` / `stream` = Twitch seul (anciennes versions de l'extension) ; hors ligne Twitch, `vods`
  contient les **3 derniers lives passés et temps forts** (types Twitch `archive` et
  `highlight` ; les vidéos téléversées et les clips sont exclus). `vod` = `vods[0]`,
  conservé pour compatibilité avec les anciennes versions de l'extension.
- `GET /api/videos?max=3&ch=main|second|react|all` → `{ videos: [...] }` — dernières vidéos
  YouTube de la chaîne demandée (`main` = @hdkabdou, `second` = @abdou_mp4,
  `react` = @ABDOUENREACT, `all` = toutes fusionnées par date). Sans `ch`, c'est `main`.
  Les chaînes se règlent dans [`lib/site-config.js`](lib/site-config.js).
- `GET /api/channels` → `{ channels: [{ key, handle, title, avatar, url }] }` —
  nom et photo de profil des chaînes YouTube (utilisé par la barre de réseaux).
- `GET /api/patreon` → `{ configured, posts: [...] }` (3 dernières publications Patreon).
  Si le jeton est absent, expiré ou révoqué : `{ configured: false, reason: "auth" }`
  (jamais d'erreur brute — l'onglet affiche la marche à suivre).
- `GET /api/config` → config publique de l'extension (liens, réseaux, chaînes YouTube,
  planning, fréquence), définie dans [`lib/site-config.js`](lib/site-config.js).
  L'extension la récupère toute seule : la modifier ne demande pas de nouvelle version.
- `GET /api/cron/patreon` → lancé **une fois par jour par le cron Vercel**
  ([`vercel.json`](vercel.json)) : renouvelle le jeton Patreon bien avant son expiration,
  vérifie l'accès et alerte sur Discord en cas de problème. Ouvert dans un navigateur
  (sans le secret du cron), il affiche seulement l'état, sans aucun jeton.
- `GET /confidentialite` → politique de confidentialité (demandée par le Chrome Web Store).

## 🔑 Patreon : pourquoi un stockage Supabase

Chez Patreon, le **refresh token ne sert qu'une fois** : à chaque renouvellement, Patreon
en donne un nouveau et l'ancien ne marche plus. Avant, le nouveau n'était gardé qu'en
mémoire : au redémarrage du serveur (fréquent sur Vercel), le proxy reprenait l'ancien
jeton des variables Vercel, déjà consommé → l'onglet Patreon cassait tous les mois.

Maintenant, le jeton courant est rangé dans la table privée `public.ext_patreon_token`
du projet Supabase **reseaux-tvabdou** (accès réservé à la clé secrète) :

- le serveur la lit au démarrage et l'écrit à chaque renouvellement ;
- un verrou empêche deux serveurs de renouveler en même temps (le jeton serait grillé) ;
- le cron quotidien renouvelle dès qu'il reste moins de 10 jours ;
- si l'accès casse quand même (accès révoqué sur Patreon…), une alerte part sur Discord
  (au plus une toutes les 12 h), puis un message « rétabli » quand ça remarche.

**Connecter / reconnecter Patreon (aucun jeton à copier) :** ouvre
**https://extension-tvabdou.vercel.app/connecter-patreon** avec le compte créateur TVABDOU et
clique « Autoriser ». Le serveur échange l'autorisation contre des jetons et les range dans
Supabase. Il refuse tout compte qui ne possède pas la campagne TVABDOU.
Prérequis (une fois) : dans le client du portail Patreon, la liste **Redirect URIs** doit contenir
`https://extension-tvabdou.vercel.app/api/patreon-callback`.

**État (sans aucun secret) :** https://extension-tvabdou.vercel.app/api/cron/patreon
(ajoute `?verifier=1` pour tester les jetons sur Patreon sans les consommer).

*Ancienne méthode, toujours possible :* coller le *Creator's Access Token* et le *Creator's
Refresh Token* dans `PATREON_ACCESS_TOKEN` / `PATREON_REFRESH_TOKEN` sur Vercel puis redéployer :
le serveur voit que les jetons de Vercel ont changé et les reprend.

Sans `SUPABASE_URL` / `SUPABASE_SECRET_KEY`, le proxy retombe sur l'ancien fonctionnement
(mémoire seule).

## Déploiement sur Vercel (5 min)

### Option A — via le dashboard (sans terminal)
1. Va sur https://vercel.com/new
2. Importe le dépôt GitHub **Extension-TvAbdou**.
3. Dans **Root Directory**, choisis le dossier **`server`**.
4. Framework Preset : **Other** (aucun).
5. Avant de déployer, ajoute les **Environment Variables** :
   | Nom | Valeur |
   |-----|--------|
   | `TWITCH_CLIENT_ID` | ton Client ID Twitch |
   | `TWITCH_CLIENT_SECRET` | ton Client Secret Twitch |
   | `YOUTUBE_API_KEY` | ta clé API YouTube |
   | `TWITCH_LOGIN` | `tvabdou` *(optionnel)* |
   | `YOUTUBE_HANDLE` | `@hdkabdou` — chaîne 1 *(optionnel)* |
   | `YOUTUBE_CHANNEL_ID` | `UC...` — chaîne 1 *(optionnel, prioritaire sur le handle)* |
   | `YOUTUBE_HANDLE_2` | `@abdou_mp4` — chaîne 2 *(optionnel)* |
   | `YOUTUBE_CHANNEL_ID_2` | `UC...` — chaîne 2 *(optionnel, prioritaire sur le handle)* |
   | `YOUTUBE_HANDLE_3` / `YOUTUBE_CHANNEL_ID_3` | chaîne 3 (@ABDOUENREACT) *(optionnels)* |
   | `PATREON_ACCESS_TOKEN` | Creator's Access Token *(facultatif si les 3 lignes suivantes sont remplies)* |
   | `PATREON_CLIENT_ID` | Client ID Patreon *(renouvellement auto)* |
   | `PATREON_CLIENT_SECRET` | Client Secret Patreon *(renouvellement auto)* |
   | `PATREON_REFRESH_TOKEN` | Creator's Refresh Token *(renouvellement auto)* |
   | `SUPABASE_URL` | `https://vxdexzrjnheojiztarsf.supabase.co` (projet reseaux-tvabdou) |
   | `SUPABASE_SECRET_KEY` | clé secrète Supabase `sb_secret_...` (Project Settings → API Keys) |
   | `DISCORD_WEBHOOK_URL` | webhook d'un salon privé Discord *(optionnel : alertes Patreon)* |
   | `CRON_SECRET` | une longue chaîne aléatoire *(optionnel : réserve le cron à Vercel)* |
6. **Deploy**. Tu obtiens une URL du type `https://tvabdou-proxy.vercel.app`.

### Option B — via la CLI
```bash
cd server
npm i -g vercel
vercel            # suivre les questions
vercel env add TWITCH_CLIENT_ID
vercel env add TWITCH_CLIENT_SECRET
vercel env add YOUTUBE_API_KEY
vercel --prod
```

## Après déploiement
Copie l'URL du proxy et mets-la dans **`config.js`** de l'extension :
```js
proxyBase: "https://TON-URL.vercel.app"
```

## Où trouver les clés
- **Twitch** : https://dev.twitch.tv/console/apps/create (Client ID + générer un Secret)
- **YouTube** : active « YouTube Data API v3 » puis crée une clé sur
  https://console.cloud.google.com/apis/credentials
- **Patreon** : va sur https://www.patreon.com/portal/registration/register-clients,
  connecté avec le **compte créateur**, crée (ou ouvre) un client. La fiche du client
  affiche quatre valeurs à recopier sur Vercel :

  | Sur la page Patreon | Variable Vercel |
  |---------------------|-----------------|
  | Client ID | `PATREON_CLIENT_ID` |
  | Client Secret | `PATREON_CLIENT_SECRET` |
  | Creator's Access Token | `PATREON_ACCESS_TOKEN` |
  | Creator's Refresh Token | `PATREON_REFRESH_TOKEN` |

  Avec les quatre (et Supabase), le proxy renouvelle l'accès tout seul, indéfiniment.
  Avec le seul `PATREON_ACCESS_TOKEN`, l'onglet cesse de fonctionner à l'expiration et il
  faut recopier le jeton à la main.
  *(Sans aucun jeton, l'onglet Patreon affiche simplement un message d'explication.)*
- **Supabase** : projet *reseaux-tvabdou* → **Project Settings → API Keys** → copie une
  clé **secrète** (`sb_secret_...`) dans `SUPABASE_SECRET_KEY`. Ne la mets jamais dans
  l'extension. (L'ancienne clé `service_role` marche aussi.)
- **Discord** : dans le salon privé voulu → **Modifier le salon → Intégrations → Webhooks →
  Nouveau webhook** → **Copier l'URL du webhook** dans `DISCORD_WEBHOOK_URL`.
