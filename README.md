<div align="center">

# TVABDOU — Live Tracker

**Extension navigateur (Chrome / Edge) pour suivre [TVABDOU](https://twitch.tv/tvabdou) en un coup d'œil.**

Sais si le stream est en live, affiche les derniers lives et temps forts, le planning,
les dernières vidéos des **3 chaînes YouTube** et les dernières publications Patreon —
avec notifications.

Lavande `#C9BCF1` · Menthe `#B9E2CE` · Noir & blanc en appui.

</div>

---

## ✨ Fonctionnalités

- 🔴 **Badge d'état** sur l'icône : `LIVE` (menthe) quand il stream sur **Twitch ou Patreon**,
  `OFF` sinon. L'icône est l'avatar de TVABDOU.
- Ⓟ **Lives Patreon** : carte « En live sur Patreon » (avec bouton *Rejoindre*), badge et
  notification, comme pour Twitch. Signalés depuis la page privée
  [`/live-patreon`](https://extension-tvabdou.vercel.app/live-patreon) (connexion avec le compte
  Patreon TVABDOU) ; la détection automatique viendra après observation d'un premier live.
- 📺 **Onglet Live / Rediffs**
  - En live : miniature, titre, nombre de viewers et **durée du stream**.
  - Hors ligne : les **3 derniers lives passés et temps forts** (date, durée, vues).
    Les clips et les vidéos téléversées sont exclus.
- 📅 **Onglet Planning** : les **7 prochains jours** du planning
  [planning-live.vercel.app](https://planning-live.vercel.app/), aujourd'hui en haut (affiches et
  heures des lives, jours off). Mis à jour tout seul quand le planning est modifié dans son éditeur.
- ▶️ **Onglet Vidéos** : les **3 dernières vidéos de chaque chaîne YouTube** —
  [@hdkabdou](https://www.youtube.com/@hdkabdou),
  [@abdou_mp4](https://www.youtube.com/@abdou_mp4) et
  [@ABDOUENREACT](https://www.youtube.com/@ABDOUENREACT) — une section par chaîne.
- Ⓟ **Onglet Patreon** : les **3 dernières publications Patreon**.
- 🔗 **Réseaux** (Twitch, les 3 chaînes YouTube avec leur vraie photo de profil,
  Patreon, Discord) accessibles sur chaque onglet.
- 🔔 **Notifications** au passage en live (Twitch ou Patreon), à chaque nouvelle vidéo sur **l'une des
  chaînes YouTube** (le nom de la chaîne est indiqué) et à chaque nouvelle publication
  Patreon, avec un bouton pour les activer / couper.
- ↻ **Bouton Actualiser** pour recharger les données à la demande (sans cache).

> **Aucune clé API dans l'extension.** Les clés (Twitch, YouTube, Patreon) vivent
> dans un petit proxy Vercel ([`server/`](server/)) — l'utilisateur n'a rien à
> configurer, il installe et ça marche.

---

## 🚀 Installation (une seule fois)

1. Télécharge `Extension-TvAbdou-vX.Y.Z.zip` dans la [dernière release](../../releases/latest)
   et décompresse-le dans un **dossier que tu ne supprimeras pas** (ex. `Documents\TVABDOU`).
2. Ouvre `chrome://extensions` (ou `edge://extensions`).
3. Active le **Mode développeur** (en haut à droite).
4. Clique **Charger l'extension non empaquetée** et sélectionne le dossier
   (celui qui contient `manifest.json`).

L'icône TVABDOU apparaît dans la barre d'outils. ✅

### 🔄 Mises à jour : automatiques
La fenêtre de l'extension affiche l'**interface servie par le serveur** : design, onglets,
textes, liens, réseaux et chaînes YouTube se mettent à jour **pour tout le monde dès que le
serveur est redéployé**, sans rien réinstaller.

Seuls les changements de ce qui tourne *dans* l'extension (notifications, badge, permissions)
demandent de réinstaller — c'est rare. Dans ce cas, l'extension affiche un **bandeau
« Nouvelle version à installer »** et envoie une notification : il suffit de refaire
l'installation ci-dessus **dans le même dossier** (remplacer les fichiers) puis de cliquer
**↻ Recharger** sur la carte de l'extension. Le champ `key` du manifest fige l'identifiant :
c'est la même extension, les réglages sont conservés.

> Sans internet (ou si le serveur est en panne), l'extension affiche sa copie embarquée de
> l'interface : rien ne casse.

---

## 🏗️ Architecture

```
extension-tvAbdou/
├── manifest.json        Manifest MV3
├── background.js        Service worker : badge LIVE/OFF, notifications (live/YouTube x2/Patreon), polling
├── popup.html           Fenêtre de l'extension = cadre qui affiche l'interface du serveur
├── shell.js / .css      Pont avec l'interface (notifications…) + repli sur la copie embarquée
├── config.js            proxyBase + copie de secours de la config (liens, chaînes, planning)
├── lib/
│   ├── api.js           Appels au proxy Vercel
│   └── settings.js      Config effective : config distante du serveur, sinon config.js
├── icons/               Avatar + icônes d'état
├── scripts/build.mjs    Construit le zip de release (npm run build)
├── store/               Optionnel : fiche pour une boutique (Chrome Web Store / Edge Add-ons)
└── server/              Proxy serverless Vercel (garde les clés API)
    ├── vercel.json      Dossier public/, cron quotidien Patreon, adresse /confidentialite
    ├── public/popup/    ⭐ L'INTERFACE (servie sur /popup/, et copie embarquée dans le zip)
    │   ├── index.html / popup.css / popup.js   Onglets, cartes, réseaux, bandeau de version
    │   ├── platform.js  Mode serveur (pont vers l'extension) ou mode copie locale
    │   └── api.js       Appels au serveur
    ├── lib/
    │   ├── site-config.js  ⭐ Liens, réseaux, chaînes YouTube (servis à l'extension)
    │   ├── twitch.js    Helper Twitch Helix
    │   ├── youtube.js   Helper YouTube (multi-chaînes)
    │   ├── patreon.js   Jeton Patreon + renouvellement automatique
    │   ├── store.js     Stockage du jeton Patreon dans Supabase
    │   ├── planning.js  Lecture du planning (7 jours, bascule à 6 h)
    │   └── alert.js     Alerte Discord si Patreon casse
    └── api/
        ├── config.js    Config publique de l'extension
        ├── status.js    Live + 3 derniers lives/temps forts (Twitch Helix)
        ├── videos.js    3 dernières vidéos par chaîne (YouTube Data API)
        ├── channels.js  Nom + photo de profil des chaînes YouTube
        ├── patreon.js   3 dernières publications (Patreon API)
        ├── planning.js  7 prochains jours du planning (relais de planning-live)
        ├── privacy.js   Politique de confidentialité (/confidentialite)
        └── cron/patreon.js  Renouvellement + vérification Patreon, 1 fois par jour
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
   | `PATREON_ACCESS_TOKEN` + `PATREON_CLIENT_ID` / `_SECRET` / `PATREON_REFRESH_TOKEN` | Patreon (onglet Patreon, avec renouvellement automatique du jeton) |
   | `SUPABASE_URL` + `SUPABASE_SECRET_KEY` | Stockage durable du jeton Patreon (projet Supabase reseaux-tvabdou) |
   | `DISCORD_WEBHOOK_URL` | Alerte Discord si l'accès Patreon casse *(optionnel)* |
   | `CRON_SECRET` | Protège le cron quotidien *(optionnel, recommandé)* |

3. Déploie, puis renseigne l'URL du proxy dans [`config.js`](config.js) (`proxyBase`).

---

## 🎨 Modifier l'extension (sans réinstallation)

| Pour changer… | Où | Effet |
|---------------|----|-------|
| Design, onglets, textes, icônes | [`server/public/popup/`](server/public/popup/) | dès le redéploiement |
| Liens, réseaux, chaînes YouTube, planning | [`server/lib/site-config.js`](server/lib/site-config.js) | dès le redéploiement |
| Notifications, badge, permissions | `background.js`, `shell.js`, `manifest.json` | nouvelle version à installer |

- **Ajouter un réseau** : une ligne dans `socials` (icônes : twitch, youtube, patreon,
  discord, instagram, tiktok, x, kick, threads, bluesky, link).
- **Ajouter une chaîne YouTube** : une entrée dans `youtube` (avec une `key` nouvelle).

[`config.js`](config.js) ne sert plus que de copie de secours (et pour `proxyBase`).

---

## 📦 Publier une nouvelle version (rare)

Seulement si `background.js`, `shell.js`, `lib/`, `config.js` ou `manifest.json` changent :

1. Augmente `version` dans `manifest.json` (ex. `1.2.0` → `1.3.0`).
2. `npm run build` → `dist/Extension-TvAbdou-v1.3.0.zip`.
3. Crée une **release GitHub** avec ce zip.
4. Mets le même numéro dans `extension.latestVersion` de
   [`server/lib/site-config.js`](server/lib/site-config.js) et redéploie : tout le monde voit
   le bandeau « Nouvelle version à installer » et reçoit une notification.

*(Plus tard, si tu veux de vraies mises à jour automatiques complètes : une boutique —
voir [`store/fiche-chrome-web-store.md`](store/fiche-chrome-web-store.md) et
`npm run build -- --store`. Edge Add-ons est gratuit, le Chrome Web Store coûte 5 $.)*

---

## 🔒 Sécurité

Les clés API ne sont **jamais** dans l'extension ni sur GitHub : elles restent dans
les variables d'environnement Vercel, côté serveur. Le proxy n'expose que des
données publiques (statut live, VOD, vidéos, publications). Le jeton Patreon courant est
rangé dans une table Supabase privée, accessible seulement avec la clé secrète du serveur.
L'extension ne collecte aucune donnée personnelle
([politique de confidentialité](https://extension-tvabdou.vercel.app/confidentialite)).
