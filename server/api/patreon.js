// GET /api/patreon -> 3 dernieres publications Patreon du createur.
// Necessite la variable d'env PATREON_ACCESS_TOKEN (Creator's Access Token).
const TOKEN = process.env.PATREON_ACCESS_TOKEN;

let campaignCache = null;

async function pget(url) {
  const r = await fetch(url, { headers: { Authorization: "Bearer " + TOKEN } });
  if (!r.ok) throw new Error("Patreon API " + r.status);
  return r.json();
}

async function getCampaignId() {
  if (campaignCache) return campaignCache;
  const j = await pget("https://www.patreon.com/api/oauth2/v2/campaigns");
  campaignCache = j.data && j.data[0] && j.data[0].id;
  if (!campaignCache) throw new Error("Campagne Patreon introuvable");
  return campaignCache;
}

// Deduit une miniature si la publication embarque une video YouTube.
function thumbFromEmbed(url) {
  if (!url) return null;
  const m = /(?:v=|youtu\.be\/|embed\/)([\w-]{11})/.exec(url);
  return m ? "https://i.ytimg.com/vi/" + m[1] + "/mqdefault.jpg" : null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=300");

  if (!TOKEN) {
    // Pas encore configure : l'extension affichera un message d'aide.
    return res.status(200).json({ configured: false, posts: [] });
  }
  try {
    const id = await getCampaignId();
    const url =
      "https://www.patreon.com/api/oauth2/v2/campaigns/" +
      id +
      "/posts?fields%5Bpost%5D=title,url,published_at,embed_url,is_public&sort=-published_at";
    const j = await pget(url);
    const posts = (j.data || []).slice(0, 3).map((p) => {
      const a = p.attributes || {};
      return {
        title: a.title || "Publication",
        url: a.url,
        date: a.published_at,
        isPublic: Boolean(a.is_public),
        thumbnail: thumbFromEmbed(a.embed_url)
      };
    });
    return res.status(200).json({ configured: true, posts });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
