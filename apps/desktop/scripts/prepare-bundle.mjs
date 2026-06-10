// Prépare une copie self-contained du dashboard à embarquer dans le .app.
// On copie ../dashboard → ./dashboard-bundle (en excluant ce qui ne doit pas voyager),
// puis on en fait un tarball `dashboard.tar.gz`. electron-builder strippe tout dossier
// nommé `node_modules` dans extraResources : on embarque donc un fichier .tar.gz (intact),
// que l'app extrait au premier lancement dans une zone inscriptible.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "..", "..", "dashboard");
const dest = path.resolve(here, "..", "dashboard-bundle");

const EXCLUDE = [
  ".env",
  path.join("prisma", "dev.db"),
  path.join("prisma", "dev.db-journal"),
  path.join(".next", "cache"),
  path.join("node_modules", ".cache"),
  ".git",
];

function isExcluded(rel) {
  if (!rel) return false;
  if (rel.endsWith(".map")) return true;
  return EXCLUDE.some((e) => rel === e || rel.startsWith(e + path.sep));
}

if (!fs.existsSync(path.join(src, ".next", "BUILD_ID"))) {
  console.error(
    "[prepare-bundle] Le dashboard n'est pas buildé. Lance d'abord `npm run build` dans apps/dashboard.",
  );
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, {
  recursive: true,
  filter: (from) => {
    const rel = path.relative(src, from);
    return !isExcluded(rel);
  },
});
console.log(`[prepare-bundle] Copié ${src} → ${dest}`);

// -h : déréférence les liens symboliques (Prisma génère .next/node_modules/@prisma/client-<hash>
// comme un symlink ABSOLU vers le node_modules de la machine de build ; sans -h, le tarball
// embarque un lien mort → "Cannot find module" sur une autre machine).
const tarball = path.resolve(here, "..", "dashboard.tar.gz");
fs.rmSync(tarball, { force: true });
execFileSync("tar", ["czhf", tarball, "-C", dest, "."], { stdio: "inherit" });
const mb = (fs.statSync(tarball).size / 1024 / 1024).toFixed(0);
console.log(`[prepare-bundle] Archive ${tarball} (${mb} Mo)`);
