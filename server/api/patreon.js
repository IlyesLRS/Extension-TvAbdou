// GET /api/patreon -> 3 dernieres publications Patreon du createur.
// Necessite la variable d'env PATREON_ACCESS_TOKEN (Creator's Access Token).
const TOKEN = process.env.PATREON_ACCESS_TOKEN;
const API = "https://www.patreon.com/api/oauth2/v2";
const FIELDS = "fields%5Bpost%5D=title,url,published_at,embed_url,is_public";

let campaignCache = null;

async function pget(url) {
  const r = await fetch(url, { headers: { Authorization: "Bearer " + TOKEN } });
  if (!r.ok) throw new Error("Patreon API " + r.status);
  return r.json();
}

async function getCampaignId() {
  if (campaignCache) return campaignCache;
  const j = await pget(API + "/campaigns");
  campaignCache = j.data && j.data[0] && j.data[0].id;
  if (!campaignCache) throw new Error("Campagne Patreon introuvable");
  return campaignCache;
}

// L'API renvoie les posts du plus ancien au plus recent et ignore ?sort,
// donc on pagine jusqu'au bout puis on trie nous-memes par date decroissante.
async function fetchAllPosts(id) {
  let next = `${API}/campaigns/${id}/posts?${FIELDS}&page%5Bcount%5D=100`;
  const all = [];
  for (let i = 0; i < 20 && next; i++) {
    const j = await pget(next);
    if (j.data) all.push(...j.data);
    if (j.links && j.links.next) {
      next = j.links.next;
    } else {
      const cur = j.meta && j.meta.pagination && j.meta.pagination.cursors && j.meta.pagination.cursors.next;
      next = cur
        ? `${API}/campaigns/${id}/posts?${FIELDS}&page%5Bcount%5D=100&page%5Bcursor%5D=${encodeURIComponent(cur)}`
        : null;
    }
  }
  return all;
}

function absoluteUrl(u) {
  if (!u) return "https://www.patreon.com";
  return u.startsWith("http") ? u : "https://www.patreon.com" + u;
}

function thumbFromEmbed(url) {
  if (!url) return null;
  const m = /(?:v=|youtu\.be\/|embed\/)([\w-]{11})/.exec(url);
  return m ? "https://i.ytimg.com/vi/" + m[1] + "/mqdefault.jpg" : null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=300");

  if (!TOKEN) {
    return res.status(200).json({ configured: false, posts: [] });
  }
  try {
    const id = await getCampaignId();
    const all = await fetchAllPosts(id);
    all.sort((a, b) => {
      const da = new Date((a.attributes && a.attributes.published_at) || 0).getTime();
      const db = new Date((b.attributes && b.attributes.published_at) || 0).getTime();
      return db - da; // plus recent d'abord
    });
    const posts = all.slice(0, 3).map((p) => {
      const a = p.attributes || {};
      return {
        title: a.title || "Publication",
        url: absoluteUrl(a.url),
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
