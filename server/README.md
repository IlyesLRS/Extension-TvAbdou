# Proxy TVABDOU (Vercel)

Petit backend serverless qui garde les clés API Twitch/YouTube **côté serveur**.
L'extension appelle uniquement ce proxy, donc aucune clé n'est exposée.

## Endpoints
- `GET /api/status` → `{ live, stream, vod }` (statut live + dernière VOD si hors ligne)
- `GET /api/videos?max=3` → `{ videos: [...] }` (dernières vidéos YouTube)
- `GET /api/patreon` → `{ configured, posts: [...] }` (3 dernières publications Patreon)

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
   | `YOUTUBE_HANDLE` | `@hdkabdou` *(optionnel)* |
   | `YOUTUBE_CHANNEL_ID` | `UC...` *(optionnel, prioritaire sur le handle)* |
   | `PATREON_ACCESS_TOKEN` | jeton créateur Patreon *(pour l'onglet Patreon)* |
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
  connecté avec le compte créateur, crée un client → copie le
  **« Creator's Access Token »**. C'est la valeur de `PATREON_ACCESS_TOKEN`.
  *(L'onglet Patreon reste masqué/affiche un message tant que ce jeton n'est pas ajouté.)*
