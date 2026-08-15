# Proxy TVABDOU (Vercel)

Petit backend serverless qui garde les clés API Twitch/YouTube **côté serveur**.
L'extension appelle uniquement ce proxy, donc aucune clé n'est exposée.

## Endpoints
- `GET /api/status` → `{ live, stream, vods, vod }` — statut live ; hors ligne, `vods`
  contient les **3 derniers lives passés et temps forts** (types Twitch `archive` et
  `highlight` ; les vidéos téléversées et les clips sont exclus). `vod` = `vods[0]`,
  conservé pour compatibilité avec les anciennes versions de l'extension.
- `GET /api/videos?max=3&ch=main|second|all` → `{ videos: [...] }` — dernières vidéos
  YouTube de la chaîne demandée (`main` = @hdkabdou, `second` = @abdou_mp4,
  `all` = les deux fusionnées par date). Sans `ch`, c'est `main`.
- `GET /api/channels` → `{ channels: [{ key, handle, title, avatar, url }] }` —
  nom et photo de profil des deux chaînes YouTube (utilisé par la barre de réseaux).
- `GET /api/patreon` → `{ configured, posts: [...] }` (3 dernières publications Patreon).
  Si le jeton est absent, expiré ou révoqué : `{ configured: false, reason: "auth" }`
  (jamais d'erreur brute — l'onglet affiche la marche à suivre).

> ⚠️ **Les jetons Patreon expirent** (~1 mois). Renseigne `PATREON_CLIENT_ID`,
> `PATREON_CLIENT_SECRET` et `PATREON_REFRESH_TOKEN` : le proxy renouvelle alors
> l'accès tout seul, sans intervention. Voir *Où trouver les clés* plus bas.

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
   | `PATREON_ACCESS_TOKEN` | Creator's Access Token *(facultatif si les 3 lignes suivantes sont remplies)* |
   | `PATREON_CLIENT_ID` | Client ID Patreon *(renouvellement auto)* |
   | `PATREON_CLIENT_SECRET` | Client Secret Patreon *(renouvellement auto)* |
   | `PATREON_REFRESH_TOKEN` | Creator's Refresh Token *(renouvellement auto)* |
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

  Avec les quatre, le proxy renouvelle l'accès automatiquement quand le jeton expire
  (il rejoue la requête après un `401`). Avec le seul `PATREON_ACCESS_TOKEN`, l'onglet
  cesse de fonctionner à l'expiration et il faut recopier le jeton à la main.
  *(Sans aucun jeton, l'onglet Patreon affiche simplement un message d'explication.)*
