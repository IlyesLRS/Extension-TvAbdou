# Fiche Chrome Web Store — TVABDOU Live Tracker

Tout ce qu'il faut copier-coller dans le tableau de bord du Chrome Web Store, dans l'ordre.
Publication choisie : **non répertoriée** (installable seulement avec le lien).

---

## 1. Créer le compte développeur (une seule fois)

1. Va sur <https://chrome.google.com/webstore/devconsole> avec le compte Google qui
   possédera l'extension.
2. Accepte le contrat, paie les **5 $** (une seule fois), puis vérifie l'adresse e-mail
   de contact.

## 2. Construire et envoyer le zip

1. À la racine du projet : `npm run build` → crée `dist/Extension-TvAbdou-v1.2.0.zip`
   (le script refuse de construire si le manifest n'est pas accepté par le Store).
2. Tableau de bord → **Nouvel élément** → dépose le zip.

## 3. Onglet « Fiche du Store »

| Champ | À mettre |
|-------|----------|
| Nom | repris du manifest : `TVABDOU - Live Tracker` |
| Résumé | repris du manifest : `TVABDOU en un coup d'œil : live, derniers lives, planning, vidéos YouTube, Patreon et notifications.` |
| Catégorie | **Mode de vie → Divertissement** |
| Langue | **Français** |
| Icône du Store (128×128) | `icons/icon-128.png` |
| Captures d'écran (1280×800) | `store/capture-1-live.png`, `store/capture-2-videos.png`, `store/capture-3-rediffs.png` |
| Petite vignette promotionnelle (440×280) | `store/vignette-440x280.png` |
| Site officiel | `https://twitch.tv/tvabdou` |
| URL d'assistance | `https://discord.com/invite/SuN3YSHjAC` |

**Description détaillée :**

```
Suis TVABDOU sans rien rater, directement depuis ton navigateur.

🔴 LIVE — L'icône affiche « LIVE » dès que le stream commence, avec le titre, le nombre de viewers et la durée du live. Hors ligne, retrouve les 3 derniers lives et temps forts.

📅 PLANNING — Le planning des lives, intégré à l'extension.

▶️ VIDÉOS — Les 3 dernières vidéos des chaînes YouTube HDKABDOU et ABDOU MP4.

Ⓟ PATREON — Les 3 dernières publications Patreon.

🔔 NOTIFICATIONS — Au début du live, à chaque nouvelle vidéo et à chaque nouvelle publication Patreon. Un clic suffit pour les couper ou les réactiver.

🔗 RÉSEAUX — Twitch, YouTube, Patreon et Discord à portée de clic.

Aucun compte, aucune configuration : installe et c'est prêt.
L'extension ne collecte aucune donnée personnelle.
```

## 4. Onglet « Pratiques de confidentialité »

**Objectif unique :**

```
Suivre l'activité du créateur TVABDOU (live Twitch, rediffusions, vidéos YouTube, publications Patreon, planning) et prévenir l'utilisateur par une notification quand un live commence ou qu'un nouveau contenu sort.
```

**Justification des autorisations :**

| Autorisation | Justification à coller |
|--------------|------------------------|
| `storage` | `Garde localement le choix d'activer ou non les notifications, le dernier live / la dernière vidéo / la dernière publication déjà vus (pour ne pas notifier deux fois) et une copie de la liste des liens et chaînes suivis.` |
| `notifications` | `Prévient l'utilisateur quand TVABDOU commence un live, publie une vidéo YouTube ou une publication Patreon.` |
| `alarms` | `Vérifie régulièrement (toutes les minutes) si un live a commencé ou si un nouveau contenu est sorti, même quand la fenêtre de l'extension est fermée.` |
| Autorisation d'hôte `https://extension-tvabdou.vercel.app/*` | `Seul serveur contacté : il renvoie les informations publiques de TVABDOU (statut du live, rediffusions, vidéos, publications) et la liste des liens. Aucune donnée sur l'utilisateur n'y est envoyée.` |

**Code distant :** coche **« Non, je n'utilise pas de code distant »**.
(L'extension télécharge seulement des données JSON et affiche le planning dans un cadre ;
tout le code est dans le zip.)

**Utilisation des données :** ne coche **aucune** catégorie de données collectées, puis
coche les **trois** certifications (pas de vente, pas d'usage sans rapport avec l'objectif,
pas d'usage pour du crédit).

**URL des règles de confidentialité :** `https://extension-tvabdou.vercel.app/confidentialite`
*(en ligne après le déploiement du serveur v1.2.0)*

## 5. Onglet « Distribution »

- Paiement : **Gratuit**
- Visibilité : **Non répertorié**
- Régions : **toutes**

## 6. Envoyer pour examen

Clique **Envoyer pour examen**. La première vérification prend en général de quelques
heures à quelques jours. Une fois validée, copie le lien de la fiche :

- ajoute-le dans `README.md` (section *Installation*) ;
- partage-le (Discord…) : chacun installe depuis ce lien **une dernière fois**, puis
  supprime l'ancienne version « non empaquetée » pour éviter les notifications en double.

---

## Publier une mise à jour

1. Fais les changements dans le code.
2. Augmente `version` dans `manifest.json` (ex. `1.2.0` → `1.2.1`).
3. `npm run build`.
4. Tableau de bord → l'extension → **Package** → **Importer un nouveau package** →
   envoie le nouveau zip, puis **Envoyer pour examen**.
5. Après validation, Chrome met à jour tout le monde **automatiquement**, sans rien faire.

> Les **liens, réseaux et chaînes YouTube** ne demandent pas de mise à jour :
> modifie `server/lib/site-config.js` et redéploie le serveur.

## Visuels

Les captures et la vignette sont des brouillons : les miniatures de vidéos y sont
simulées (dégradé lavande/menthe). Pour des captures avec les vraies miniatures, refais-les
depuis l'extension installée quand TVABDOU est en live.
