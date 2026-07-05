# TVABDOU — Live Tracker (extension navigateur)

Extension Chrome / Edge (Manifest V3) qui affiche si **TVABDOU** est en live, la
dernière VOD, le planning, les 3 dernières vidéos YouTube, et envoie des
notifications (live Twitch + nouvelle vidéo YouTube).

## Fonctionnalités
- 🟣 **Badge sur l'icône** : `LIVE` (rouge) quand il stream, `OFF` (gris) sinon.
- **Onglet Live / VOD** : titre, nombre de viewers et durée du stream en direct ;
  sinon la dernière VOD avec sa date, sa durée et son nombre de vues.
- **Réseaux sociaux** : Twitch, YouTube, Patreon, Discord (sous le live).
- **Onglet Planning** : intégration du planning Twitch.
- **Onglet Vidéos** : les 3 dernières vidéos YouTube.
- **Notifications** : quand il passe en live et quand une vidéo YouTube sort.
- 🔔 **Bouton pour couper/activer les notifications** (en haut à droite du popup).

## Installation (mode développeur)
1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active **Mode développeur** (en haut à droite).
3. Clique **Charger l'extension non empaquetée** et sélectionne ce dossier
   `extension-tvAbdou`.
4. L'icône TVABDOU apparaît dans la barre d'outils.

## Configuration des clés API (indispensable)
Clique sur l'icône puis « ⚙️ Options », ou fais clic droit sur l'icône → Options.

### Twitch (obligatoire)
1. Va sur https://dev.twitch.tv/console/apps/create
2. Crée une application (URL de redirection : `http://localhost`).
3. Copie le **Client ID** et génère un **Client Secret**.
4. Colle-les dans la page Options.

### YouTube (pour l'onglet Vidéos et les notifs YouTube)
1. Active « YouTube Data API v3 » sur https://console.cloud.google.com/apis/library/youtube.googleapis.com
2. Crée une **clé API** dans « Identifiants ».
3. Colle-la dans la page Options.

## Personnalisation
Tout est dans `config.js` :
- `twitchLogin` : le login Twitch (`tvabdou`).
- `youtubeHandle` : le handle YouTube (`@dikabdou`).
- `socials` : les liens réseaux affichés.
- `pollMinutes` : fréquence de vérification (défaut 1 min).

## Notes
- Les clés sont stockées **localement** (`chrome.storage.local`), rien n'est
  envoyé ailleurs que vers les API officielles Twitch/YouTube.
- Le planning apparaît uniquement si TVABDOU a configuré un planning sur Twitch.
- Attention au quota YouTube Data API (10 000 unités/jour par défaut, largement
  suffisant ici).
