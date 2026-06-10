// Orchestration du dashboard pour l'app Electron.
// Module Node pur (sans dépendance Electron) pour rester testable :
//   migrate deploy → seed → next start → attente que le port réponde.

const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

function log(onLog, msg) {
  console.log(`[bootstrap] ${msg}`);
  if (onLog) onLog(msg);
}

// Exécute une commande Node et résout à la sortie 0.
function runNode(scriptPath, args, { cwd, env, onLog, label }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      // ELECTRON_RUN_AS_NODE : indispensable quand process.execPath est Electron,
      // pour que le binaire se comporte comme un Node classique.
      env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let tail = "";
    const cap = (d) => {
      tail = (tail + d.toString()).slice(-2000);
    };
    child.stdout.on("data", cap);
    child.stderr.on("data", cap);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} a échoué (code ${code}) :\n${tail}`));
    });
  });
}

function waitForServer(port, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(
        { host: "127.0.0.1", port, path: "/", timeout: 2000 },
        (res) => {
          res.destroy();
          resolve();
        },
      );
      req.on("error", retry);
      req.on("timeout", () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Le serveur n'a pas répondu à temps."));
      } else {
        setTimeout(tryOnce, 400);
      }
    };
    tryOnce();
  });
}

function resolveBin(dashboardDir, ...parts) {
  return path.join(dashboardDir, "node_modules", ...parts);
}

/**
 * Démarre le dashboard. Retourne { child, port } une fois le serveur prêt.
 * @param {object} opts
 * @param {string} opts.dashboardDir  chemin du dossier apps/dashboard
 * @param {string} opts.dbPath        chemin absolu du fichier SQLite (zone inscriptible)
 * @param {number} opts.port          port HTTP
 * @param {boolean} [opts.dev]        true = `next dev` (hot-reload), false = `next start` (build)
 * @param {(msg:string)=>void} [opts.onLog]
 */
async function startDashboard({ dashboardDir, dbPath, port, dev = false, onLog }) {
  const env = {
    ...process.env,
    DATABASE_URL: `file:${dbPath}`,
    PORT: String(port),
    NODE_ENV: dev ? "development" : "production",
  };

  const prismaCli = resolveBin(dashboardDir, "prisma", "build", "index.js");
  const nextCli = resolveBin(dashboardDir, "next", "dist", "bin", "next");
  const seedScript = path.join(dashboardDir, "prisma", "seed.mjs");
  const buildId = path.join(dashboardDir, ".next", "BUILD_ID");

  // En mode production, on a besoin d'un build. En dev, `next dev` compile à la volée.
  if (!dev && !fs.existsSync(buildId)) {
    log(onLog, "Build du dashboard (première fois)…");
    await runNode(nextCli, ["build"], { cwd: dashboardDir, env, onLog, label: "next build" });
  }

  log(onLog, "Mise à jour de la base de données…");
  await runNode(prismaCli, ["migrate", "deploy"], {
    cwd: dashboardDir,
    env,
    onLog,
    label: "prisma migrate deploy",
  });

  log(onLog, "Initialisation des données…");
  await runNode(seedScript, [], { cwd: dashboardDir, env, onLog, label: "seed" });

  log(onLog, `Démarrage du serveur (${dev ? "dev" : "prod"}) sur le port ${port}…`);
  const child = spawn(
    process.execPath,
    [nextCli, dev ? "dev" : "start", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: dashboardDir,
      env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));

  await waitForServer(port);
  log(onLog, "Serveur prêt.");
  return { child, port };
}

module.exports = { startDashboard, waitForServer };
