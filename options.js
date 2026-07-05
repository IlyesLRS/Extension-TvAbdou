const fields = ["twitchClientId", "twitchClientSecret", "youtubeApiKey"];

// Charger les valeurs existantes
chrome.storage.local.get(fields, (d) => {
  fields.forEach((f) => {
    if (d[f]) document.getElementById(f).value = d[f];
  });
});

document.getElementById("save").addEventListener("click", () => {
  const data = {};
  fields.forEach((f) => {
    data[f] = document.getElementById(f).value.trim();
  });
  // On efface le token en cache pour forcer une regeneration avec les nouvelles cles
  chrome.storage.local.set(data, () => {
    chrome.storage.local.remove(["twitchToken", "twitchTokenExp"], () => {
      const s = document.getElementById("status");
      s.textContent = "✓ Enregistré !";
      s.className = "status ok";
      // relance une verification immediate
      chrome.runtime.sendMessage({ type: "poll-now" }).catch(() => {});
      setTimeout(() => (s.textContent = ""), 2500);
    });
  });
});
