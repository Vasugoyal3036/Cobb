import { BrowserWindow as e, Notification as t, app as n, ipcMain as r, net as i, protocol as a, shell as o } from "electron";
import s from "node:path";
import { fileURLToPath as c } from "node:url";
import l from "node:fs";
import { spawn as u } from "node:child_process";
import d from "node:http";
//#region electron/main.js
var f = s.dirname(c(import.meta.url));
process.env.APP_ROOT = s.join(f, "..");
var p = process.env.VITE_DEV_SERVER_URL, m = s.join(process.env.APP_ROOT, "dist-electron"), h = s.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = p ? s.join(process.env.APP_ROOT, "public") : h, a.registerSchemesAsPrivileged([{
	scheme: "app",
	privileges: {
		secure: !0,
		standard: !0,
		supportFetchAPI: !0,
		corsEnabled: !0,
		bypassCSP: !0
	}
}]);
var g, _ = null;
function v() {
	let e = [
		s.join(process.env.APP_ROOT, "..", "CobbDashboard", "server.js"),
		"D:\\cobbbb\\CobbDashboard\\server.js",
		s.join(process.cwd(), "..", "CobbDashboard", "server.js"),
		s.join(process.cwd(), "CobbDashboard", "server.js")
	].find((e) => l.existsSync(e));
	if (!e) {
		console.log("[Electron] Backend server.js not found at any candidate path");
		return;
	}
	let t = s.dirname(e);
	s.join(t, "cloud_sync.js");
	try {
		d.get("http://127.0.0.1:5000/api/sales/overview", (e) => {
			console.log("[Electron] Backend server is already running on port 5000");
		}).on("error", () => {
			console.log("[Electron] Starting backend server from:", e), _ = u("node", [e], {
				cwd: t,
				stdio: "pipe",
				shell: !1,
				windowsHide: !0
			}), _.stdout.on("data", (e) => {
				console.log(`[Backend] ${e.toString().trim()}`);
			}), _.stderr.on("data", (e) => {
				console.error(`[Backend ERR] ${e.toString().trim()}`);
			}), _.on("close", (e) => {
				console.log(`[Backend] Process exited with code ${e}`), _ = null;
			});
		});
	} catch (e) {
		console.error("[Electron] Error checking backend status:", e);
	}
}
function y() {
	_ &&= (console.log("[Electron] Stopping backend server..."), _.kill(), null);
}
function b() {
	let t = s.join(process.env.VITE_PUBLIC, "ors-logo.png"), n = s.join(process.env.VITE_PUBLIC, "favicon.svg"), r = l.existsSync(t) ? t : n;
	g = new e({
		title: "Goyal - House Of Fashion | Retail POS & Chain OS",
		width: 1280,
		height: 800,
		minWidth: 1024,
		minHeight: 768,
		icon: l.existsSync(r) ? r : void 0,
		webPreferences: {
			preload: s.join(f, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !0,
			webSecurity: !1
		}
	}), g.setMenuBarVisibility(!1), g.setAutoHideMenuBar(!0), g.webContents.on("console-message", (e, t, n, r, i) => {
		let a = typeof e == "object" && e?.message !== void 0 ? e.message : n;
		console.log(`[Renderer Console] ${a}`);
	}), g.webContents.on("before-input-event", (e, t) => {
		t.key === "F11" && t.type === "keyDown" ? (g.setFullScreen(!g.isFullScreen()), e.preventDefault()) : t.key === "F5" && t.type === "keyDown" ? (g.reload(), e.preventDefault()) : t.control && t.shift && t.key.toLowerCase() === "i" && t.type === "keyDown" && (g.webContents.toggleDevTools(), e.preventDefault());
	}), g.webContents.setWindowOpenHandler(({ url: e }) => ((e.startsWith("https://") || e.startsWith("http://wa") || e.startsWith("whatsapp://")) && o.openExternal(e), { action: "deny" })), p ? (console.log("[Electron] Loading dev server URL:", p), g.loadURL(p)) : (console.log("[Electron] Loading app://index.html"), g.loadURL("app://-/index.html")), g.webContents.on("did-fail-load", (e, t, n) => {
		console.error("[Electron] Failed to load:", t, n);
	});
}
n.on("window-all-closed", () => {
	y(), process.platform !== "darwin" && (n.quit(), g = null);
}), n.on("activate", () => {
	e.getAllWindows().length === 0 && b();
}), n.on("before-quit", () => {
	y();
}), r.handle("open-external", async (e, t) => typeof t == "string" && (t.startsWith("https://") || t.startsWith("http://") || t.startsWith("whatsapp://")) ? (await o.openExternal(t), !0) : !1), r.handle("kick-cash-drawer", async () => (console.log("[Electron POS] Hardware Cash Drawer Kick Triggered (ESC p 0 25 250)"), {
	success: !0,
	timestamp: Date.now()
})), r.handle("print-silent-thermal", async (e, t = {}) => {
	if (!g) return {
		success: !1,
		error: "No active window"
	};
	try {
		let e = (await g.webContents.getPrintersAsync()).find((e) => e.name.toLowerCase().includes("pos") || e.name.toLowerCase().includes("thermal") || e.name.toLowerCase().includes("receipt") || e.isDefault);
		return g.webContents.print({
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
}), r.handle("show-desktop-notification", async (e, { title: n, body: r, icon: i } = {}) => {
	try {
		if (t.isSupported()) {
			let e = s.join(process.env.VITE_PUBLIC, "ors-logo.png"), a = i && l.existsSync(i) ? i : l.existsSync(e) ? e : void 0, o = new t({
				title: n || "Cobb POS Notification",
				body: r || "",
				icon: a
			});
			return o.on("click", () => {
				g && (g.isMinimized() && g.restore(), g.focus());
			}), o.show(), { success: !0 };
		}
	} catch (e) {
		console.warn("[Electron Notification Warning]:", e.message);
	}
	return { success: !1 };
}), n.whenReady().then(() => {
	v(), a.handle("app", (e) => {
		let t = e.url.substring(8);
		t ||= "index.html", t = t.split("?")[0].split("#")[0];
		let n = s.join(h, t);
		return l.existsSync(n) || (n = s.join(h, "index.html")), i.fetch("file://" + n);
	}), b();
});
//#endregion
export { m as MAIN_DIST, h as RENDERER_DIST, p as VITE_DEV_SERVER_URL };
