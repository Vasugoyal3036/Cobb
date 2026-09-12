import { BrowserWindow as e, app as t, net as n, protocol as r } from "electron";
import i from "node:path";
import { fileURLToPath as a } from "node:url";
import o from "node:fs";
import { spawn as s } from "node:child_process";
//#region electron/main.js
var c = i.dirname(a(import.meta.url));
process.env.APP_ROOT = i.join(c, "..");
var l = process.env.VITE_DEV_SERVER_URL, u = i.join(process.env.APP_ROOT, "dist-electron"), d = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = l ? i.join(process.env.APP_ROOT, "public") : d, r.registerSchemesAsPrivileged([{
	scheme: "app",
	privileges: {
		secure: !0,
		standard: !0,
		supportFetchAPI: !0
	}
}]);
var f, p = null;
function m() {
	let e = i.join(process.env.APP_ROOT, "..", "CobbDashboard"), t = i.join(e, "server.js");
	if (!o.existsSync(t)) {
		console.log("[Electron] Backend server.js not found at:", t);
		return;
	}
	console.log("[Electron] Starting backend server..."), p = s("node", [t], {
		cwd: e,
		stdio: "pipe",
		shell: !0
	}), p.stdout.on("data", (e) => {
		console.log(`[Backend] ${e.toString().trim()}`);
	}), p.stderr.on("data", (e) => {
		console.error(`[Backend ERR] ${e.toString().trim()}`);
	}), p.on("close", (e) => {
		console.log(`[Backend] Process exited with code ${e}`), p = null;
	});
}
function h() {
	p &&= (console.log("[Electron] Stopping backend server..."), p.kill(), null);
}
function g() {
	f = new e({
		width: 1280,
		height: 800,
		minWidth: 1024,
		minHeight: 768,
		icon: i.join(process.env.VITE_PUBLIC, "favicon.ico"),
		webPreferences: {
			preload: i.join(c, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !0
		}
	}), f.webContents.on("console-message", (e, t, n, r, i) => {
		console.log(`[Renderer Console] ${n} (line ${r} in ${i})`);
	}), l ? (console.log("[Electron] Loading dev server URL:", l), f.loadURL(l)) : (console.log("[Electron] Loading app://index.html"), f.loadURL("app://-/index.html")), f.webContents.on("did-fail-load", (e, t, n) => {
		console.error("[Electron] Failed to load:", t, n);
	});
}
t.on("window-all-closed", () => {
	h(), process.platform !== "darwin" && (t.quit(), f = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && g();
}), t.on("before-quit", () => {
	h();
}), t.whenReady().then(() => {
	m(), r.handle("app", (e) => {
		let t = e.url.substring(8);
		t ||= "index.html", t = t.split("?")[0].split("#")[0];
		let r = i.join(d, t);
		return o.existsSync(r) || (r = i.join(d, "index.html")), n.fetch("file://" + r);
	}), g();
});
//#endregion
export { u as MAIN_DIST, d as RENDERER_DIST, l as VITE_DEV_SERVER_URL };
