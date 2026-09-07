import { BrowserWindow as e, app as t, net as n, protocol as r } from "electron";
import i from "node:path";
import { fileURLToPath as a } from "node:url";
import o from "node:fs";
//#region electron/main.js
var s = i.dirname(a(import.meta.url));
process.env.APP_ROOT = i.join(s, "..");
var c = process.env.VITE_DEV_SERVER_URL, l = i.join(process.env.APP_ROOT, "dist-electron"), u = i.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = c ? i.join(process.env.APP_ROOT, "public") : u, r.registerSchemesAsPrivileged([{
	scheme: "app",
	privileges: {
		secure: !0,
		standard: !0,
		supportFetchAPI: !0
	}
}]);
var d;
function f() {
	d = new e({
		width: 1280,
		height: 800,
		minWidth: 1024,
		minHeight: 768,
		icon: i.join(process.env.VITE_PUBLIC, "favicon.ico"),
		webPreferences: {
			preload: i.join(s, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !0
		}
	}), d.webContents.openDevTools(), d.webContents.on("console-message", (e, t, n, r, i) => {
		console.log(`[Renderer Console] ${n} (line ${r} in ${i})`);
	}), c ? (console.log("[Electron] Loading dev server URL:", c), d.loadURL(c)) : (console.log("[Electron] Loading app://index.html"), d.loadURL("app://-/index.html")), d.webContents.on("did-fail-load", (e, t, n) => {
		console.error("[Electron] Failed to load:", t, n);
	});
}
t.on("window-all-closed", () => {
	process.platform !== "darwin" && (t.quit(), d = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && f();
}), t.whenReady().then(() => {
	r.handle("app", (e) => {
		let t = e.url.substring(8);
		t ||= "index.html", t = t.split("?")[0].split("#")[0];
		let r = i.join(u, t);
		return o.existsSync(r) || (r = i.join(u, "index.html")), n.fetch("file://" + r);
	}), f();
});
//#endregion
export { l as MAIN_DIST, u as RENDERER_DIST, c as VITE_DEV_SERVER_URL };
