<div align="center">

# TVABDOU — Live Tracker

**Extension navigateur (Chrome / Edge) pour suivre [TVABDOU](https://twitch.tv/tvabdou) en un coup d'œil.**

Sais si le stream est en live, affiche la dernière VOD, le planning, les dernières
vidéos YouTube et les dernières publications Patreon — avec notifications.

Lavande `#C9BCF1` · Menthe `#B9E2CE` · Noir & blanc en appui.

</div>

---

## ✨ Fonctionnalités

- 🔴 **Badge d'état** sur l'icône : `LIVE` (menthe) quand il stream, `OFF` sinon.
  L'icône est l'avatar de TVABDOU.
- 📺 **Onglet Live / VOD**
  - En live : miniature, titre, nombre de viewers et **durée du stream**.
  - Hors ligne : **dernière VOD** avec sa date, sa durée et son nombre de vues.
- 📅 **Onglet Planning** : le planning [planning-live.vercel.app](https://planning-live.vercel.app/) intégré.
- ▶️ **Onglet Vidéos** : les **3 dernières vidéos YouTube**.
- Ⓟ **Onglet Patreon** : les **3 dernières publications Patreon**.
- 🔗 **Réseaux** (Twitch, YouTube, Patreon, Discord) accessibles sur chaque onglet.
- 🔔 **Notifications** au passage en live et à chaque nouvelle vidéo YouTube,
  avec un bouton pour les activer / couper.
- ↻ **Bouton Actualiser** pour recharger les données à la demande (sans cache).

> **Aucune clé API dans l'extension.** Les clés (Twitch, YouTube, Patreon) vivent
> dans un petit proxy Vercel ([`server/`](server/)) — l'utilisateur n'a rien à
> configurer, il installe et ça marche.

---

## 🚀 Installation

1. Télécharge le `.zip` de la [dernière release](../../releases/latest) et décompresse-le
   (ou clone ce dépôt).
2. Ouvre `chrome://extensions` (ou `edge://extensions`).
3. Active le **Mode développeur** (en haut à droite).
4. Clique **Charger l'extension non empaquetée** et sélectionne le dossier
   (celui qui contient `manifest.json`).

L'icône TVABDOU apparaît dans la barre d'outils. ✅

### 🔄 Mettre à jour
Charge l'extension depuis un **dossier stable** (le dépôt cloné), puis à chaque
mise à jour clique simplement **↻ Recharger** sur la carte de l'extension dans
`chrome://extensions`. Le champ `key` du manifest fige l'identifiant : même
rechargée depuis un autre dossier, c'est **la même extension** (réglages conservés).

---

## 🏗️ Architecture

```
extension-tvAbdou/
├── manifest.json        Manifest MV3
├── background.js        Service worker : badge LIVE/OFF, notifications, polling
├── popup.html/.css/.js  Interface (4 onglets + barre réseaux + bouton actualiser)
├── config.js            Chaîne, planning, réseaux
├── lib/api.js           Appels au proxy Vercel
├── icons/               Avatar + icônes d'état
└── server/              Proxy serverless Vercel (garde les clés API)
    └── api/
        ├── status.js    Live + dernière VOD (Twitch Helix)
        ├── videos.js    3 dernières vidéos (YouTube Data API)
        └── patreon.js   3 dernières publications (Patreon API)
```

L'extension ne parle qu'au **proxy** ; le proxy détient les clés (variables
d'environnement Vercel) et n'expose que des données publiques.

---

## ⚙️ Configuration du proxy (une seule fois)

Voir [`server/README.md`](server/README.md) pour le détail. En résumé :

1. Importe le dossier `server/` sur [Vercel](https://vercel.com/new)
   (**Root Directory = `server`**).
2. Ajoute les variables d'environnement :

   | Variable | Rôle |
   |----------|------|
   | `TWITCH_CLIENT_ID` | Twitch (live + VOD) |
   | `TWITCH_CLIENT_SECRET` | Twitch |
   | `YOUTUBE_API_KEY` | YouTube (onglet Vidéos + notifs) |
   | `PATREON_ACCESS_TOKEN` | Patreon (onglet Patreon) |

3. Déploie, puis renseigne l'URL du proxy dans [`config.js`](config.js) (`proxyBase`).

---

## 🎨 Personnalisation

Tout est dans [`config.js`](config.js) : `proxyBase`, `twitchLogin`, `planningUrl`,
`socials`, `pollMinutes`. Les identifiants de chaîne (login Twitch, handle YouTube,
campagne Patreon) se règlent via les variables d'environnement du proxy.

---

## 🔒 Sécurité

Les clés API ne sont **jamais** dans l'extension ni sur GitHub : elles restent dans
les variables d'environnement Vercel, côté serveur. Le proxy n'expose que des
données publiques (statut live, VOD, vidéos, publications).
