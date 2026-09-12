import { BrowserWindow as e, app as t, net as n, protocol as r } from "electron";
import i from "node:path";
import { fileURLToPath as a } from "node:url";
import o from "node:fs";
import { spawn as s } from "node:child_process";
import c from "node:http";
//#region electron/main.js
var l = i.dirname(a(import.meta.url));
process.env.APP_ROOT = i.join(l, "..");
var u = process.env.VITE_DEV_SERVER_URL, d = i.join(process.env.APP_ROOT, "dist-electron"), f = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = u ? i.join(process.env.APP_ROOT, "public") : f, r.registerSchemesAsPrivileged([{
	scheme: "app",
	privileges: {
		secure: !0,
		standard: !0,
		supportFetchAPI: !0,
		corsEnabled: !0
	}
}]);
var p, m = null, h = null;
function g() {
	let e = [
		i.join(process.env.APP_ROOT, "..", "CobbDashboard", "server.js"),
		"D:\\cobbbb\\CobbDashboard\\server.js",
		i.join(process.cwd(), "..", "CobbDashboard", "server.js"),
		i.join(process.cwd(), "CobbDashboard", "server.js")
	].find((e) => o.existsSync(e));
	if (!e) {
		console.log("[Electron] Backend server.js not found at any candidate path");
		return;
	}
	let t = i.dirname(e), n = i.join(t, "cloud_sync.js");
	try {
		c.get("http://localhost:5000/api/sales/overview", (e) => {
			console.log("[Electron] Backend server is already running on port 5000");
		}).on("error", () => {
			console.log("[Electron] Starting backend server from:", e), m = s("node", [e], {
				cwd: t,
				stdio: "pipe",
				shell: !0
			}), m.stdout.on("data", (e) => {
				console.log(`[Backend] ${e.toString().trim()}`);
			}), m.stderr.on("data", (e) => {
				console.error(`[Backend ERR] ${e.toString().trim()}`);
			}), m.on("close", (e) => {
				console.log(`[Backend] Process exited with code ${e}`), m = null;
			}), o.existsSync(n) && (console.log("[Electron] Starting sync agent from:", n), h = s("node", [n], {
				cwd: t,
				stdio: "pipe",
				shell: !0
			}), h.stdout.on("data", (e) => {
				console.log(`[Sync Agent] ${e.toString().trim()}`);
			}), h.stderr.on("data", (e) => {
				console.error(`[Sync Agent ERR] ${e.toString().trim()}`);
			}), h.on("close", (e) => {
				console.log(`[Sync Agent] Process exited with code ${e}`), h = null;
			}));
		});
	} catch (e) {
		console.error("[Electron] Error checking backend status:", e);
	}
}
function _() {
	m &&= (console.log("[Electron] Stopping backend server..."), m.kill(), null), h &&= (console.log("[Electron] Stopping sync agent..."), h.kill(), null);
}
function v() {
	let t = i.join(process.env.VITE_PUBLIC, "favicon.svg");
	p = new e({
		width: 1280,
		height: 800,
		minWidth: 1024,
		minHeight: 768,
		icon: o.existsSync(t) ? t : void 0,
		webPreferences: {
			preload: i.join(l, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !0,
			webSecurity: !1
		}
	}), p.webContents.on("console-message", (e, t, n, r, i) => {
		console.log(`[Renderer Console] ${n} (line ${r} in ${i})`);
	}), u ? (console.log("[Electron] Loading dev server URL:", u), p.loadURL(u)) : (console.log("[Electron] Loading app://index.html"), p.loadURL("app://-/index.html")), p.webContents.on("did-fail-load", (e, t, n) => {
		console.error("[Electron] Failed to load:", t, n);
	});
}
t.on("window-all-closed", () => {
	_(), process.platform !== "darwin" && (t.quit(), p = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && v();
}), t.on("before-quit", () => {
	_();
}), t.whenReady().then(() => {
	g(), r.handle("app", (e) => {
		let t = e.url.substring(8);
		t ||= "index.html", t = t.split("?")[0].split("#")[0];
		let r = i.join(f, t);
		return o.existsSync(r) || (r = i.join(f, "index.html")), n.fetch("file://" + r);
	}), v();
});
//#endregion
export { d as MAIN_DIST, f as RENDERER_DIST, u as VITE_DEV_SERVER_URL };
