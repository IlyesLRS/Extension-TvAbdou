// Enregistreur : garde un instantane des derniers posts Patreon (tous les champs documentes)
// dans ext_patreon_post_log, avec l'indication « un live etait signale a ce moment ».
// But : voir a quoi ressemble un live Patreon dans l'API pour ajouter la detection automatique.
import { createHash } from "node:crypto";
import { storeEnabled, logPosts } from "./store.js";

export async function recordPosts(posts, liveOn) {
  if (!storeEnabled || !posts || !posts.length) return;
  // Les 5 plus recents + jusqu'a 3 posts sans date de publication (un live programme pourrait l'etre).
  const undated = posts.filter((p) => !(p.attributes && p.attributes.published_at)).slice(0, 3);
  const pick = [...posts.slice(0, 5), ...undated.filter((p) => !posts.slice(0, 5).includes(p))];
  const rows = pick.map((p) => {
    const a = { ...(p.attributes || {}) };
    if (typeof a.content === "string") a.content = a.content.slice(0, 500);
    const json = JSON.stringify(a);
    return {
      post_id: String(p.id),
      live_on: Boolean(liveOn),
      attributes: a,
      attr_hash: createHash("sha256").update(json + "|" + Boolean(liveOn)).digest("hex").slice(0, 32)
    };
  });
  try {
    await logPosts(rows);
  } catch (e) {
    console.warn("journal des posts Patreon :", e.message);
  }
}
