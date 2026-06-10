const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const { execFileSync } = require("node:child_process");
const { startDashboard } = require("./bootstrap");

let mainWindow = null;
let serverChild = null;

// Résolution du dossier dashboard :
//  - packagé : le dashboard voyage en tarball (resources/dashboard.tar.gz) et est extrait
//    au premier lancement dans userData/dashboard (zone inscriptible). Réextrait si le
//    tarball change (mise à jour de l'app).
//  - non packagé (dev local) : le dossier du repo ../dashboard
//  - VCM_DASHBOARD_DIR surcharge tout
const DEV_MODE = process.env.VCM_DEV === "1";

function ensurePackagedDashboard(onLog) {
  const tarball = path.join(process.resourcesPath, "dashboard.tar.gz");
  const target = path.join(app.getPath("userData"), "dashboard");
  const marker = path.join(app.getPath("userData"), ".dashboard.version");

  const st = fs.statSync(tarball);
  const sig = `${st.size}-${Math.round(st.mtimeMs)}`;
  const ready = fs.existsSync(path.join(target, ".next", "BUILD_ID"));
  const current = fs.existsSync(marker)
    ? fs.readFileSync(marker, "utf8").trim()
    : "";

  if (!ready || current !== sig) {
    if (onLog) onLog("Installation du dashboard (première fois)…");
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
    execFileSync("tar", ["xzf", tarball, "-C", target]);
    fs.writeFileSync(marker, sig);
  }
  return target;
}

function dashboardDir(onLog) {
  if (process.env.VCM_DASHBOARD_DIR) return process.env.VCM_DASHBOARD_DIR;
  if (app.isPackaged) return ensurePackagedDashboard(onLog);
  return path.join(__dirname, "..", "dashboard");
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0b0d12",
    titleBarStyle: "hiddenInset",
    show: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  mainWindow.loadFile(path.join(__dirname, "loading.html"));

  // Les liens externes (sources YouTube, URLs de posts) s'ouvrent dans le navigateur.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function setStatus(msg) {
  if (!mainWindow) return;
  const safe = JSON.stringify(msg);
  mainWindow.webContents
    .executeJavaScript(`window.__setStatus && window.__setStatus(${safe});`)
    .catch(() => {});
}

async function boot() {
  try {
    const dir = dashboardDir(setStatus);
    if (!fs.existsSync(path.join(dir, "package.json"))) {
      throw new Error(`Dashboard introuvable : ${dir}`);
    }
    const dbPath = path.join(app.getPath("userData"), "vcm.db");
    const port = await getFreePort();

    const { child } = await startDashboard({
      dashboardDir: dir,
      dbPath,
      port,
      dev: DEV_MODE,
      onLog: setStatus,
    });
    serverChild = child;

    if (mainWindow) {
      await mainWindow.loadURL(`http://127.0.0.1:${port}`);
    }
  } catch (err) {
    console.error(err);
    setStatus(`Erreur : ${err.message}`);
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "Démarrage impossible",
        message: "Viral Cut Manager n'a pas pu démarrer.",
        detail: String(err.message || err),
      });
    }
  }
}

function stopServer() {
  if (serverChild && !serverChild.killed) {
    serverChild.kill("SIGTERM");
    serverChild = null;
  }
}

app.whenReady().then(() => {
  createWindow();
  boot();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopServer();
  app.quit();
});

app.on("before-quit", stopServer);
process.on("exit", stopServer);
