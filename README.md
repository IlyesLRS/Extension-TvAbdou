# TVABDOU — Live Tracker (extension navigateur)

Extension Chrome / Edge (Manifest V3) qui affiche si **TVABDOU** est en live, la
dernière VOD, le planning et les dernières vidéos YouTube, avec notifications.

> **Aucune clé API dans l'extension.** Les clés Twitch/YouTube vivent dans un petit
> proxy Vercel (dossier [`server/`](server/)). L'utilisateur n'a **rien à configurer** :
> il installe et ça marche.

## Fonctionnalités
- 🟣 **Badge sur l'icône** : `LIVE` quand il stream, `OFF` sinon (l'icône est son avatar).
- **Onglet Live / VOD** : titre, viewers et durée du stream en direct ; sinon la
  dernière VOD (date, durée, vues).
- **Réseaux** : Twitch, YouTube, Patreon, Discord.
- **Onglet Planning** : intégration en direct de https://planning-live.vercel.app/
- **Onglet Vidéos** : les 3 dernières vidéos YouTube.
- **Notifications** : passage en live + nouvelle vidéo YouTube.
- 🔔 **Bouton pour couper/activer les notifications**.

## Direction artistique
Lavande `#C9BCF1` (principal) · Menthe `#B9E2CE` (secondaire) · Noir & blanc.

## Mise en place (2 étapes)

### 1) Déployer le proxy (une seule fois)
Suis [`server/README.md`](server/README.md) : import du dossier `server/` sur Vercel
+ 3 variables d'environnement (`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`,
`YOUTUBE_API_KEY`). Tu obtiens une URL type `https://tvabdou-proxy.vercel.app`.

### 2) Brancher l'extension sur le proxy
Dans [`config.js`](config.js), remplace :
```js
proxyBase: "https://REMPLACE-MOI.vercel.app"
```
par l'URL de ton proxy.

### Installer l'extension
1. `chrome://extensions` → active **Mode développeur**.
2. **Charger l'extension non empaquetée** → sélectionne **ce dossier** (celui qui
   contient `manifest.json`).

### Mettre à jour (un simple « Recharger » suffit)
Charge l'extension **depuis un dossier stable** (ce dossier projet), pas depuis un
zip décompressé à chaque fois. Ensuite, à chaque nouvelle version, il suffit de
cliquer le bouton **↻ Recharger** sur la carte de l'extension dans
`chrome://extensions` — la nouvelle permission et les nouveaux fichiers sont pris
en compte automatiquement.

> Le champ `key` du manifest fige l'identifiant de l'extension : même rechargée
> depuis un autre dossier, elle reste **la même extension** (réglages conservés,
> pas de doublon).

## Personnalisation
Tout est dans [`config.js`](config.js) : `twitchLogin`, `planningUrl`, `socials`,
`pollMinutes`. Les identifiants de chaîne (login Twitch, handle YouTube) côté données
se règlent via les variables d'environnement du proxy.

## Sécurité
Les clés API ne sont **jamais** dans l'extension ni sur GitHub : elles restent dans
les variables d'environnement Vercel, côté serveur. Le proxy n'expose que des données
publiques (statut live, VOD, vidéos).
