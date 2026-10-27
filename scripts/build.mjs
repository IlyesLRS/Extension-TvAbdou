// Construit le zip de l'extension : dist/Extension-TvAbdou-v<version>.zip
//   npm run build           -> zip a publier en release GitHub (installation "non empaquetee")
//   npm run build -- --store -> variante sans le champ "key", pour une boutique
//                               (Chrome Web Store / Edge Add-ons, qui refusent ce champ)
// Aucune dependance : le zip est ecrit a la main (deflate de Node).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { deflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

const STORE = process.argv.includes("--store");

// Fichiers de l'extension. Du dossier server/, seule la copie de secours de l'interface part
// dans le zip (server/public/popup/) ; le reste du serveur, les docs et les scripts non.
const INCLUDE = ["manifest.json", "background.js", "config.js", "popup.html", "shell.js", "shell.css", "lib", "icons", "server/public/popup"];

function walk(p) {
  const abs = join(ROOT, p);
  if (statSync(abs).isDirectory()) return readdirSync(abs).sort().flatMap((n) => walk(join(p, n)));
  return [p];
}

// ---------- Verifications ----------
const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
const errors = [];
if (STORE) delete manifest.key; // refuse par les boutiques (elles attribuent leur propre identifiant)
if (!/^\d+(\.\d+){0,3}$/.test(manifest.version || "")) errors.push("version invalide : " + manifest.version);
if ((manifest.description || "").length > 132) errors.push("description > 132 caracteres");
const referenced = [
  manifest.background && manifest.background.service_worker,
  manifest.action && manifest.action.default_popup,
  "shell.js",
  "server/public/popup/index.html",
  "server/public/popup/popup.js",
  ...Object.values((manifest.action && manifest.action.default_icon) || {}),
  ...Object.values(manifest.icons || {})
].filter(Boolean);
for (const f of referenced) if (!existsSync(join(ROOT, f))) errors.push("fichier manquant : " + f);
if (errors.length) {
  console.error("Build annule :\n - " + errors.join("\n - "));
  process.exit(1);
}

// ---------- Zip ----------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  };
}

const files = INCLUDE.flatMap(walk).map((p) => p.split(sep).join("/"));
const locals = [];
const centrals = [];
let offset = 0;

for (const name of files) {
  const data = name === "manifest.json" ? Buffer.from(JSON.stringify(manifest, null, 2) + "\n") : readFileSync(join(ROOT, name));
  const comp = deflateRawSync(data, { level: 9 });
  const useDeflate = comp.length < data.length;
  const body = useDeflate ? comp : data;
  const crc = crc32(data);
  const { time, date } = dosTime(statSync(join(ROOT, name)).mtime);
  const nameBuf = Buffer.from(name, "utf8");

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6); // noms en UTF-8
  local.writeUInt16LE(useDeflate ? 8 : 0, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  locals.push(local, nameBuf, body);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(useDeflate ? 8 : 0, 10);
  central.writeUInt16LE(time, 12);
  central.writeUInt16LE(date, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, nameBuf);

  offset += local.length + nameBuf.length + body.length;
}

const centralBuf = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);

mkdirSync(join(ROOT, "dist"), { recursive: true });
const out = join(ROOT, "dist", "Extension-TvAbdou-v" + manifest.version + (STORE ? "-store" : "") + ".zip");
writeFileSync(out, Buffer.concat([...locals, centralBuf, end]));
console.log("OK : " + relative(ROOT, out) + " (" + files.length + " fichiers)");
