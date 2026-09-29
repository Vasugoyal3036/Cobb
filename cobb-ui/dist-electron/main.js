import { BrowserWindow as e, app as t, ipcMain as n, net as r, protocol as i, shell as a } from "electron";
import o from "node:path";
import { fileURLToPath as s } from "node:url";
import c from "node:fs";
import { spawn as l } from "node:child_process";
import u from "node:http";
//#region electron/main.js
var d = o.dirname(s(import.meta.url));
process.env.APP_ROOT = o.join(d, "..");
var f = process.env.VITE_DEV_SERVER_URL, p = o.join(process.env.APP_ROOT, "dist-electron"), m = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = f ? o.join(process.env.APP_ROOT, "public") : m, i.registerSchemesAsPrivileged([{
	scheme: "app",
	privileges: {
		secure: !0,
		standard: !0,
		supportFetchAPI: !0,
		corsEnabled: !0
	}
}]);
var h, g = null;
function _() {
	let e = [
		o.join(process.env.APP_ROOT, "..", "CobbDashboard", "server.js"),
		"D:\\cobbbb\\CobbDashboard\\server.js",
		o.join(process.cwd(), "..", "CobbDashboard", "server.js"),
		o.join(process.cwd(), "CobbDashboard", "server.js")
	].find((e) => c.existsSync(e));
	if (!e) {
		console.log("[Electron] Backend server.js not found at any candidate path");
		return;
	}
	let t = o.dirname(e);
	o.join(t, "cloud_sync.js");
	try {
		u.get("http://localhost:5000/api/sales/overview", (e) => {
			console.log("[Electron] Backend server is already running on port 5000");
		}).on("error", () => {
			console.log("[Electron] Starting backend server from:", e), g = l("node", [e], {
				cwd: t,
				stdio: "pipe",
				shell: !1,
				windowsHide: !0
			}), g.stdout.on("data", (e) => {
				console.log(`[Backend] ${e.toString().trim()}`);
			}), g.stderr.on("data", (e) => {
				console.error(`[Backend ERR] ${e.toString().trim()}`);
			}), g.on("close", (e) => {
				console.log(`[Backend] Process exited with code ${e}`), g = null;
			});
		});
	} catch (e) {
		console.error("[Electron] Error checking backend status:", e);
	}
}
function v() {
	g &&= (console.log("[Electron] Stopping backend server..."), g.kill(), null);
}
function y() {
	let t = o.join(process.env.VITE_PUBLIC, "ors-logo.png"), n = o.join(process.env.VITE_PUBLIC, "favicon.svg"), r = c.existsSync(t) ? t : n;
	h = new e({
		title: "ORS",
		width: 1280,
		height: 800,
		minWidth: 1024,
		minHeight: 768,
		icon: c.existsSync(r) ? r : void 0,
		webPreferences: {
			preload: o.join(d, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !0,
			webSecurity: !1
		}
	}), h.webContents.on("console-message", (e, t, n, r, i) => {
		console.log(`[Renderer Console] ${n} (line ${r} in ${i})`);
	}), h.webContents.setWindowOpenHandler(({ url: e }) => ((e.startsWith("https://") || e.startsWith("http://wa") || e.startsWith("whatsapp://")) && a.openExternal(e), { action: "deny" })), f ? (console.log("[Electron] Loading dev server URL:", f), h.loadURL(f)) : (console.log("[Electron] Loading app://index.html"), h.loadURL("app://-/index.html")), h.webContents.on("did-fail-load", (e, t, n) => {
		console.error("[Electron] Failed to load:", t, n);
	});
}
t.on("window-all-closed", () => {
	v(), process.platform !== "darwin" && (t.quit(), h = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && y();
}), t.on("before-quit", () => {
	v();
}), n.handle("open-external", async (e, t) => typeof t == "string" && (t.startsWith("https://") || t.startsWith("http://") || t.startsWith("whatsapp://")) ? (await a.openExternal(t), !0) : !1), t.whenReady().then(() => {
	_(), i.handle("app", (e) => {
		let t = e.url.substring(8);
		t ||= "index.html", t = t.split("?")[0].split("#")[0];
		let n = o.join(m, t);
		return c.existsSync(n) || (n = o.join(m, "index.html")), r.fetch("file://" + n);
	}), y();
});
//#endregion
export { p as MAIN_DIST, m as RENDERER_DIST, f as VITE_DEV_SERVER_URL };
