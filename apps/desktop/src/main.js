import { app, BrowserWindow, Menu } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const WINDOW_MIN_WIDTH = 1180;
const WINDOW_MIN_HEIGHT = 760;

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    backgroundColor: "#11100d",
    title: "UCRE Demo",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);
  window.loadFile(resolveGameIndexPath());
}

function resolveGameIndexPath() {
  const packagedIndex = path.join(app.getAppPath(), "game-dist", "index.html");
  if (existsSync(packagedIndex)) {
    return packagedIndex;
  }

  return path.resolve(currentDirectory, "..", "..", "game", "dist", "index.html");
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
