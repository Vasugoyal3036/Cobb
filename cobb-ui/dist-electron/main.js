import { BrowserWindow as e, Notification as t, app as n, globalShortcut as r, ipcMain as i, net as a, protocol as o, shell as s } from "electron";
import c from "node:path";
import { fileURLToPath as l } from "node:url";
import u from "node:fs";
import { spawn as d } from "node:child_process";
import f from "node:http";
//#region electron/main.js
var p = c.dirname(l(import.meta.url));
process.env.APP_ROOT = c.join(p, "..");
var m = process.env.VITE_DEV_SERVER_URL, h = c.join(process.env.APP_ROOT, "dist-electron"), g = c.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = m ? c.join(process.env.APP_ROOT, "public") : g, n.requestSingleInstanceLock() || (console.log("[Electron] Another instance is already running. Quitting duplicate."), n.quit()), n.commandLine.appendSwitch("js-flags", "--max-old-space-size=256"), n.commandLine.appendSwitch("disable-site-isolation-trials"), n.commandLine.appendSwitch("renderer-process-limit", "2"), n.commandLine.appendSwitch("disable-speech-api"), o.registerSchemesAsPrivileged([{
	scheme: "app",
	privileges: {
		secure: !0,
		standard: !0,
		supportFetchAPI: !0,
		corsEnabled: !0,
		bypassCSP: !0
	}
}]);
var _, v = null;
function y() {
	let e = [
		c.join(process.env.APP_ROOT, "..", "CobbDashboard", "server.js"),
		"D:\\cobbbb\\CobbDashboard\\server.js",
		c.join(process.cwd(), "..", "CobbDashboard", "server.js"),
		c.join(process.cwd(), "CobbDashboard", "server.js")
	].find((e) => u.existsSync(e));
	if (!e) {
		console.log("[Electron] Backend server.js not found at any candidate path");
		return;
	}
	let t = c.dirname(e);
	c.join(t, "cloud_sync.js");
	try {
		f.get("http://127.0.0.1:5000/api/sales/overview", (e) => {
			console.log("[Electron] Backend server is already running on port 5000");
		}).on("error", () => {
			console.log("[Electron] Starting backend server from:", e), v = d("node", [e], {
				cwd: t,
				stdio: "pipe",
				shell: !1,
				windowsHide: !0
			}), v.stdout.on("data", (e) => {
				console.log(`[Backend] ${e.toString().trim()}`);
			}), v.stderr.on("data", (e) => {
				console.error(`[Backend ERR] ${e.toString().trim()}`);
			}), v.on("close", (e) => {
				console.log(`[Backend] Process exited with code ${e}`), v = null;
			});
		});
	} catch (e) {
		console.error("[Electron] Error checking backend status:", e);
	}
}
function b() {
	v &&= (console.log("[Electron] Stopping backend server..."), v.kill(), null);
}
function x() {
	let t = c.join(process.env.VITE_PUBLIC, "app.ico"), n = c.join(process.env.VITE_PUBLIC, "cobb-icon-512.png"), r = c.join(process.env.VITE_PUBLIC, "cobb-logo.png"), i = u.existsSync(t) ? t : u.existsSync(n) ? n : r;
	_ = new e({
		title: "COBB ITALY | Showroom POS & Intelligence Command Center",
		width: 1280,
		height: 800,
		minWidth: 1024,
		minHeight: 768,
		icon: u.existsSync(i) ? i : void 0,
		webPreferences: {
			preload: c.join(p, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !0,
			webSecurity: !1,
			backgroundThrottling: !0,
			spellcheck: !1
		}
	}), _.on("minimize", () => {
		_ && _.webContents && _.webContents.session.clearCache().catch(() => {});
	}), _.setMenuBarVisibility(!1), _.setAutoHideMenuBar(!0), _.webContents.on("console-message", (e, t, n, r, i) => {
		let a = typeof e == "object" && e?.message !== void 0 ? e.message : n;
		console.log(`[Renderer Console] ${a}`);
	}), _.webContents.on("before-input-event", (e, t) => {
		t.key === "F11" && t.type === "keyDown" ? (_.setFullScreen(!_.isFullScreen()), e.preventDefault()) : t.key === "F5" && t.type === "keyDown" ? (_.reload(), e.preventDefault()) : t.control && t.shift && t.key.toLowerCase() === "i" && t.type === "keyDown" && (_.webContents.toggleDevTools(), e.preventDefault());
	}), _.webContents.setWindowOpenHandler(({ url: e }) => ((e.startsWith("https://") || e.startsWith("http://wa") || e.startsWith("whatsapp://")) && s.openExternal(e), { action: "deny" })), m ? (console.log("[Electron] Loading dev server URL:", m), _.loadURL(m)) : (console.log("[Electron] Loading app://index.html"), _.loadURL("app://-/index.html")), _.webContents.on("did-fail-load", (e, t, n) => {
		console.error("[Electron] Failed to load:", t, n);
	});
}
n.on("window-all-closed", () => {
	b(), process.platform !== "darwin" && (n.quit(), _ = null);
}), n.on("activate", () => {
	e.getAllWindows().length === 0 && x();
}), n.on("second-instance", () => {
	_ && (_.isMinimized() && _.restore(), _.isVisible() || _.show(), _.focus());
}), n.on("before-quit", () => {
	b();
}), n.on("will-quit", () => {
	r.unregisterAll();
}), i.handle("open-external", async (e, t) => typeof t == "string" && (t.startsWith("https://") || t.startsWith("http://") || t.startsWith("whatsapp://")) ? (await s.openExternal(t), !0) : !1), i.handle("kick-cash-drawer", async () => (console.log("[Electron POS] Hardware Cash Drawer Kick Triggered (ESC p 0 25 250)"), {
	success: !0,
	timestamp: Date.now()
})), i.handle("print-silent-thermal", async (e, t = {}) => {
	if (!_) return {
		success: !1,
		error: "No active window"
	};
	try {
		let e = (await _.webContents.getPrintersAsync()).find((e) => e.name.toLowerCase().includes("pos") || e.name.toLowerCase().includes("thermal") || e.name.toLowerCase().includes("receipt") || e.isDefault);
		return _.webContents.print({
			silent: !0,
			deviceName: e?.name || "",
			margins: { marginType: "none" },
			...t
		}, (e, t) => {
			console.log("[Electron Thermal Print]", e ? "Success" : `Failed: ${t}`);
		}), {
			success: !0,
			printerName: e?.name
		};
	} catch (e) {
		return {
			success: !1,
			error: e.message
		};
	}
}), i.handle("show-desktop-notification", async (e, { title: n, body: r, icon: i } = {}) => {
	try {
		if (t.isSupported()) {
			let e = c.join(process.env.VITE_PUBLIC, "ors-logo.png"), a = i && u.existsSync(i) ? i : u.existsSync(e) ? e : void 0, o = new t({
				title: n || "Cobb POS Notification",
				body: r || "",
				icon: a
			});
			return o.on("click", () => {
				_ && (_.isMinimized() && _.restore(), _.focus());
			}), o.show(), { success: !0 };
		}
	} catch (e) {
		console.warn("[Electron Notification Warning]:", e.message);
	}
	return { success: !1 };
}), n.whenReady().then(() => {
	y(), o.handle("app", (e) => {
		let t = e.url.substring(8);
		t ||= "index.html", t = t.split("?")[0].split("#")[0];
		let n = c.join(g, t);
		return u.existsSync(n) || (n = c.join(g, "index.html")), a.fetch("file://" + n);
	}), x();
	try {
		let e = "CommandOrControl+Shift+X", t = r.register(e, () => {
			console.log(`[Electron Hotkey] ${e} triggered`), _ && (_.isMinimized() ? (_.restore(), _.focus()) : _.isFocused() ? _.minimize() : (_.isVisible() || _.show(), _.restore(), _.focus()));
		});
		console.log(`[Electron Hotkey] ${e} registration: ${t ? "SUCCESS" : "FAILED"}`);
	} catch (e) {
		console.warn("[Electron Hotkey Error]", e.message);
	}
});
//#endregion
export { h as MAIN_DIST, g as RENDERER_DIST, m as VITE_DEV_SERVER_URL };
