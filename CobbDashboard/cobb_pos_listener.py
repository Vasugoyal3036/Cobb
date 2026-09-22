import time
import requests
import pyodbc
import sys
import os
import socket
import signal
import atexit
import datetime
import json

# Ensure UTF-8 output on Windows console
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def get_lock():
    get_lock._lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        get_lock._lock_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        get_lock._lock_socket.bind(('127.0.0.1', 47200))
        return True
    except socket.error:
        print("Another instance of the listener is already running.")
        return False

# Configuration
STORE_ADDRESS = "Cobb Apparels, Fatehpur Road, Pundri"
LOCATION_LINK = "https://maps.app.goo.gl/HxgE1M25h32oWY2H9?g_st=ac"
DIRECT_REVIEW_LINK = "https://search.google.com/local/writereview?placeid=ChIJHfCBR58ZDjkRpBbB9EV-Zew"
INSTAGRAM_LINK = "https://www.instagram.com/cobbpundri"
FACEBOOK_LINK = "https://www.facebook.com/share/14ra4KrNJa3/"
MEDIA_FILE = "WhatsApp Image 2026-08-14 at 20.35.17.jpeg"
WHATSAPP_SERVER_URL = "http://localhost:3000/send"
SENT_BILLS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sent_bills.txt")
SENT_EOD_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sent_eod_date.txt")
DISPATCHES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "automation_dispatches.json")
ENGINE_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "automation_engine.log")
EOD_RECIPIENTS = ['9138122820', '8708788707', '9034522000', '9466422821']

def log_engine(msg):
    ts = time.strftime('%X')
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        with open(ENGINE_LOG_FILE, 'a', encoding='utf-8') as lf:
            lf.write(line + "\n")
    except Exception:
        pass

def record_dispatch_event(bill_no, cm_id, customer_name, phone, reason, status, detail):
    now_iso = datetime.datetime.now().isoformat()
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    time_str = time.strftime('%I:%M %p')
    event = {
        'timestamp': now_iso,
        'date': today_str,
        'time': time_str,
        'billNo': bill_no,
        'cmId': cm_id,
        'customerName': (customer_name or 'Valued Customer').strip(),
        'phone': phone or '',
        'reason': reason,  # 'checkout' or 'exchange'
        'status': status,  # 'sent', 'not_on_whatsapp', 'failed', 'no_phone'
        'detail': detail
    }
    try:
        events = []
        if os.path.exists(DISPATCHES_FILE):
            try:
                with open(DISPATCHES_FILE, 'r', encoding='utf-8') as f:
                    events = json.load(f)
            except Exception:
                events = []

        # Update existing record in-place if present, otherwise append
        updated = False
        target_cm = str(cm_id or '').strip()
        target_bill = str(bill_no or '').strip()
        if target_cm or target_bill:
            for idx in reversed(range(len(events))):
                ev_cm = str(events[idx].get('cmId') or '').strip()
                ev_bill = str(events[idx].get('billNo') or '').strip()
                if (target_cm and ev_cm == target_cm) or (target_bill and ev_bill == target_bill):
                    events[idx] = event
                    updated = True
                    break

        if not updated:
            events.append(event)

        if len(events) > 500:
            events = events[-500:]
        with open(DISPATCHES_FILE, 'w', encoding='utf-8') as f:
            json.dump(events, f, indent=2)
    except Exception as e:
        log_engine(f"[DISPATCH RECORD ERROR] {e}")

def normalize_phone_number(raw_phone):
    """Sanitizes and formats phone numbers to standard 91XXXXXXXXXX format."""
    if not raw_phone:
        return ""
    digits = ''.join(filter(str.isdigit, str(raw_phone)))
    digits = digits.lstrip('0')
    if len(digits) == 10:
        return f"91{digits}"
    if len(digits) == 12 and digits.startswith('91'):
        return digits
    if len(digits) > 10:
        return f"91{digits[-10:]}"
    return digits

def send_daily_closing_digest(cursor, target_date=None, label_suffix=""):
    """Compiles and sends the store owner closing digest to all configured numbers."""
    try:
        if target_date:
            date_filter = f"m.CM_TIME >= '{target_date}' AND m.CM_TIME < DATEADD(day, 1, '{target_date}')"
            try:
                t_dt = datetime.datetime.strptime(target_date, '%Y-%m-%d')
                date_display = t_dt.strftime('%d %b %Y')
            except Exception:
                date_display = target_date
        else:
            date_filter = "m.CM_TIME >= CAST(GETDATE() AS DATE)"
            date_display = time.strftime('%d %b %Y')

        # 1. Sales & Bills
        cursor.execute(f"""
            SELECT 
                COUNT(CM_ID) as BillCount,
                ISNULL(SUM(NET_AMOUNT), 0) as GrossSales,
                ISNULL(SUM(DISCOUNT_AMOUNT), 0) as TotalDiscount,
                ISNULL(SUM(TOTAL_GST_AMOUNT), 0) as TaxCollected,
                ISNULL(SUM(NET_AMOUNT - TOTAL_GST_AMOUNT), 0) as NetSales
            FROM CMM01106 m WITH (NOLOCK)
            WHERE {date_filter} AND m.CANCELLED = 0
        """)
        sales_row = cursor.fetchone()
        bill_count = int(sales_row[0] or 0)
        gross_sales = int(round(float(sales_row[1] or 0)))
        total_discount = int(round(float(sales_row[2] or 0)))
        tax_collected = int(round(float(sales_row[3] or 0)))

        # 2. Payment modes
        cursor.execute(f"""
            SELECT 
                ISNULL(SUM(p.CASH_AMOUNT), 0) as Cash,
                ISNULL(SUM(p.CC_AMOUNT), 0) as Card,
                ISNULL(SUM(w.UPI + w.[Paytm QR] + w.Paytm + w.[PAYTM UPI] + w.RazorpayUPI), 0) as UPI
            FROM CMM01106 m WITH (NOLOCK)
            LEFT JOIN VW_BILL_PAYMODE p WITH (NOLOCK) ON m.CM_ID = p.MEMO_ID AND p.XN_TYPE = 'SLS'
            LEFT JOIN VW_WL_CASHMEMOLIST w WITH (NOLOCK) ON m.CM_ID = w.MEMO_ID
            WHERE {date_filter} AND m.CANCELLED = 0
        """)
        pay_row = cursor.fetchone()
        cash = int(round(float(pay_row[0] or 0)))
        card = int(round(float(pay_row[1] or 0)))
        upi = int(round(float(pay_row[2] or 0)))

        # 3. Exchanges
        cursor.execute(f"""
            SELECT 
                COUNT(DISTINCT m.CM_ID) as ExchangeBills,
                ISNULL(SUM(ABS(d.NET)), 0) as ExchangeValue,
                ISNULL(SUM(m.NET_AMOUNT), 0) as NetUpsellDiff
            FROM CMD01106 d WITH (NOLOCK)
            JOIN CMM01106 m WITH (NOLOCK) ON d.CM_ID = m.CM_ID
            WHERE d.QUANTITY < 0 AND m.CANCELLED = 0 AND {date_filter}
        """)
        exch_row = cursor.fetchone()
        exch_bills = int(exch_row[0] or 0)
        exch_value = int(round(float(exch_row[1] or 0)))
        exch_upsell = int(round(float(exch_row[2] or 0)))

        # 4. Top Category
        cursor.execute(f"""
            SELECT TOP 1 
                ISNULL(e.SUB_SECTION_NAME, 'Apparel') as TopCategory, 
                SUM(d.QUANTITY) as UnitsSold,
                ISNULL(SUM(d.NET), 0) as CategorySales
            FROM CMD01106 d WITH (NOLOCK)
            JOIN CMM01106 m WITH (NOLOCK) ON d.CM_ID = m.CM_ID
            JOIN SKU c WITH (NOLOCK) ON d.PRODUCT_CODE = c.PRODUCT_CODE
            JOIN ARTICLE a WITH (NOLOCK) ON c.ARTICLE_CODE = a.ARTICLE_CODE
            LEFT JOIN SECTIOND e WITH (NOLOCK) ON a.SUB_SECTION_CODE = e.SUB_SECTION_CODE
            WHERE d.QUANTITY > 0 AND m.CANCELLED = 0 AND {date_filter}
            GROUP BY e.SUB_SECTION_NAME
            ORDER BY UnitsSold DESC
        """)
        top_cat_row = cursor.fetchone()
        top_cat_name = str(top_cat_row[0] or 'Apparel').strip() if top_cat_row else 'Apparel'
        top_cat_units = int(top_cat_row[1] or 0) if top_cat_row else 0

        upsell_sign = '+' if exch_upsell >= 0 else ''
        closing_tag = label_suffix if label_suffix else (" (9:30 PM Closing)" if not target_date else "")

        msg = (
            f"📊 *COBB PUNDRI — STORE CLOSING DIGEST*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📅 *Date:* {date_display}{closing_tag}\n"
            f"🏪 *Store:* Cobb Apparels, Fatehpur Road, Pundri\n\n"
            f"💰 *SALES PERFORMANCE:*\n"
            f"• Total Net Sales: *₹{gross_sales:,}*\n"
            f"• Total Bills Processed: *{bill_count} Bills*\n"
            f"• Total Customer Discounts Given: *₹{total_discount:,}*\n"
            f"• Tax (GST) Collected: *₹{tax_collected:,}*\n\n"
            f"💳 *COLLECTIONS BREAKDOWN:*\n"
            f"• 💵 Cash in Drawer: *₹{cash:,}*\n"
            f"• 💳 Debit/Credit Cards: *₹{card:,}*\n"
            f"• 📱 UPI / Digital: *₹{upi:,}*\n\n"
            f"🔄 *CUSTOMER EXCHANGES:*\n"
            f"• Exchange Bills Handled: *{exch_bills}*\n"
            f"• Replacement Value: *₹{exch_value:,}*\n"
            f"• Net Exchange Upsell: *{upsell_sign}₹{exch_upsell:,}*\n\n"
            f"🏆 *TOP PERFORMING SECTION:*\n"
            f"• Category: *{top_cat_name}*\n"
            f"• Units Moved: *{top_cat_units} items*\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"✨ Automated EOD Store Intelligence System"
        )

        delivered_count = 0
        for num in EOD_RECIPIENTS:
            clean_phone = normalize_phone_number(num)
            if not clean_phone:
                continue
            try:
                r = requests.post(WHATSAPP_SERVER_URL, json={'number': clean_phone, 'message': msg}, headers={'Content-Type': 'application/json'}, timeout=15)
                if r.status_code == 200:
                    delivered_count += 1
                    print(f"[{time.strftime('%X')}] [EOD DIGEST SENT] Delivered to {clean_phone}", flush=True)
                else:
                    print(f"[{time.strftime('%X')}] [EOD SEND WARNING] Server returned status {r.status_code} for {clean_phone}", flush=True)
            except Exception as send_err:
                print(f"[{time.strftime('%X')}] [EOD SEND ERROR] Failed for {clean_phone}: {send_err}", flush=True)

        return delivered_count > 0
    except Exception as e:
        print(f"[{time.strftime('%X')}] [EOD REPORT GENERATION ERROR] {e}", flush=True)
        return False

def is_eod_already_sent(target_date_str):
    """Checks whether the EOD digest for target_date_str has already been sent."""
    if os.path.exists(SENT_EOD_FILE):
        try:
            with open(SENT_EOD_FILE, 'r', encoding='utf-8') as f:
                return f.read().strip() == target_date_str
        except Exception:
            pass
    return False

def record_eod_sent(target_date_str):
    """Persists the successfully dispatched EOD date to sent_eod_date.txt."""
    try:
        with open(SENT_EOD_FILE, 'w', encoding='utf-8') as f:
            f.write(target_date_str)
        return True
    except Exception as e:
        log_engine(f"[SENT EOD LOG ERROR] {e}")
        return False

def trigger_eod_closing_dispatch(cursor, label_suffix=" (Store Closing Digest)"):
    """
    Executes the store closing digest dispatch.
    First tries the CRM backend endpoint for detailed drawer/petty-cash reconciliation,
    and falls back to direct SQL execution + port 3000 WhatsApp sender.
    """
    now = time.localtime()
    today_str = time.strftime('%Y-%m-%d', now)

    if is_eod_already_sent(today_str):
        log_engine(f"[EOD CLOSING] EOD digest for {today_str} was already dispatched today.")
        return True

    # Verify bills exist today
    try:
        cursor.execute("SELECT COUNT(CM_ID) FROM CMM01106 WITH (NOLOCK) WHERE CM_TIME >= CAST(GETDATE() AS DATE) AND CANCELLED = 0")
        b_count = cursor.fetchone()[0] or 0
        if b_count == 0:
            log_engine(f"[EOD CLOSING] 0 bills punched today ({today_str}). Skipping EOD dispatch.")
            return False
    except Exception as err:
        log_engine(f"[EOD CLOSING CHECK ERROR] {err}")
        return False

    log_engine(f"[EOD CLOSING DISPATCH] Initiating EOD Store Closing digest for {today_str} ({b_count} bills)...")

    # 1. Attempt dispatch via CRM Backend (includes petty cash & drawer reconciliation)
    sent_via_crm = False
    try:
        res = requests.post(
            'http://localhost:5000/api/reports/eod-summary/send',
            json={'date': today_str},
            headers={'Content-Type': 'application/json'},
            timeout=8
        )
        if res.status_code == 200 and res.json().get('success'):
            sent_via_crm = True
            log_engine(f"[EOD CLOSING] Successfully dispatched comprehensive EOD digest via CRM Backend.")
    except Exception as crm_err:
        log_engine(f"[EOD CLOSING CRM FALLBACK] CRM API unreachable ({crm_err}). Falling back to direct database query...")

    if not sent_via_crm:
        # 2. Fallback to direct SQL query & direct port 3000 dispatch
        if send_daily_closing_digest(cursor, label_suffix=label_suffix):
            record_eod_sent(today_str)
            return True
        else:
            log_engine(f"[EOD CLOSING ERROR] Direct EOD send failed.")
            return False
    else:
        record_eod_sent(today_str)
        return True

_wnd_proc_ref = None

def setup_windows_shutdown_watcher(cursor):
    """
    Spawns a native Win32 message loop on Windows to intercept system shutdown/restart/logoff
    events (WM_QUERYENDSESSION / WM_ENDSESSION). Guarantees that when the cashier or staff
    shuts down the counter PC in the evening, the EOD digest is dispatched before Windows turns off.
    """
    if os.name != 'nt':
        return None

    try:
        import ctypes
        from ctypes import wintypes
        import threading

        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32

        user32.ShutdownBlockReasonCreate.argtypes = [wintypes.HWND, wintypes.LPCWSTR]
        user32.ShutdownBlockReasonCreate.restype = wintypes.BOOL
        user32.ShutdownBlockReasonDestroy.argtypes = [wintypes.HWND]
        user32.ShutdownBlockReasonDestroy.restype = wintypes.BOOL

        WNDPROC = ctypes.WINFUNCTYPE(ctypes.c_longlong, wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)

        class WNDCLASSW(ctypes.Structure):
            _fields_ = [
                ('style', wintypes.UINT),
                ('lpfnWndProc', WNDPROC),
                ('cbClsExtra', ctypes.c_int),
                ('cbWndExtra', ctypes.c_int),
                ('hInstance', wintypes.HINSTANCE),
                ('hIcon', wintypes.HICON),
                ('hCursor', wintypes.HICON),
                ('hbrBackground', wintypes.HBRUSH),
                ('lpszMenuName', wintypes.LPCWSTR),
                ('lpszClassName', wintypes.LPCWSTR),
            ]

        user32.RegisterClassW.argtypes = [ctypes.POINTER(WNDCLASSW)]
        user32.RegisterClassW.restype = wintypes.ATOM

        user32.CreateWindowExW.argtypes = [
            wintypes.DWORD, wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.DWORD,
            ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
            wintypes.HWND, wintypes.HMENU, wintypes.HINSTANCE, wintypes.LPVOID
        ]
        user32.CreateWindowExW.restype = wintypes.HWND

        user32.DefWindowProcW.argtypes = [wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]
        user32.DefWindowProcW.restype = ctypes.c_longlong

        user32.GetMessageW.argtypes = [ctypes.POINTER(wintypes.MSG), wintypes.HWND, wintypes.UINT, wintypes.UINT]
        user32.GetMessageW.restype = wintypes.BOOL

        user32.DispatchMessageW.argtypes = [ctypes.POINTER(wintypes.MSG)]
        user32.DispatchMessageW.restype = ctypes.c_longlong

        WM_QUERYENDSESSION = 0x0011
        WM_ENDSESSION = 0x0016

        def on_shutdown_event(hwnd):
            now = time.localtime()
            # Store closing shutdown window: 8:00 PM (20:00) onwards
            if now.tm_hour >= 20:
                log_engine(f"[SHUTDOWN HOOK] Windows system shutdown detected at {now.tm_hour}:{now.tm_min:02d}. Holding shutdown to dispatch EOD digest...")
                try:
                    user32.ShutdownBlockReasonCreate(hwnd, "Dispatching Cobb Store EOD Closing Digest via WhatsApp...")
                    trigger_eod_closing_dispatch(cursor, label_suffix=" (Store Closing Digest)")
                except Exception as ex:
                    log_engine(f"[SHUTDOWN HOOK ERROR] {ex}")
                finally:
                    try:
                        user32.ShutdownBlockReasonDestroy(hwnd)
                    except Exception:
                        pass
                    log_engine(f"[SHUTDOWN HOOK] Shutdown block released. Allowing system shutdown.")

        def py_wnd_proc(hwnd, msg, wparam, lparam):
            if msg == WM_QUERYENDSESSION:
                on_shutdown_event(hwnd)
                return 1
            elif msg == WM_ENDSESSION:
                return 0
            return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

        global _wnd_proc_ref
        _wnd_proc_ref = WNDPROC(py_wnd_proc)

        def message_pump_loop():
            try:
                cls = WNDCLASSW()
                cls.lpfnWndProc = _wnd_proc_ref
                cls.lpszClassName = 'CobbPosShutdownWatcher'
                cls.hInstance = kernel32.GetModuleHandleW(None)
                user32.RegisterClassW(ctypes.byref(cls))

                hwnd = user32.CreateWindowExW(
                    0, cls.lpszClassName, 'CobbPosWatcher', 0, 0, 0, 0, 0, None, None, cls.hInstance, None
                )
                log_engine(f"[SHUTDOWN WATCHER] Native Windows shutdown watcher active (HWND: {hwnd}).")

                msg = wintypes.MSG()
                while user32.GetMessageW(ctypes.byref(msg), 0, 0, 0) > 0:
                    user32.DispatchMessageW(ctypes.byref(msg))
            except Exception as pump_err:
                log_engine(f"[SHUTDOWN WATCHER ERROR] {pump_err}")

        t = threading.Thread(target=message_pump_loop, name="Win32ShutdownWatcher", daemon=True)
        t.start()
        return t
    except Exception as e:
        log_engine(f"[SHUTDOWN WATCHER INIT ERROR] {e}")
        return None


def get_db_connection():
    available_drivers = [d for d in pyodbc.drivers() if 'SQL Server' in d]
    if not available_drivers:
        raise Exception("No SQL Server ODBC Driver found on this machine.")
    
    selected_driver = available_drivers[0]
    for d in ['ODBC Driver 18 for SQL Server', 'ODBC Driver 17 for SQL Server', 'SQL Server Native Client 11.0', 'SQL Server']:
        if d in available_drivers:
            selected_driver = d
            break

    conn_str = (
        f"Driver={{{selected_driver}}};"
        r"Server=DESKTOP-88CLSMJ\SQLEXPRESS;"
        "Database=RPD_AVATAR01_NEW_ST_POS;"
        "Trusted_Connection=yes;"
    )
    if '18' in selected_driver:
        conn_str += "TrustServerCertificate=yes;"

    return pyodbc.connect(conn_str)

def send_whatsapp_message(phone_number, customer_name):
    """Sends standard post-purchase thank you message for regular sales bills."""
    clean_phone = normalize_phone_number(phone_number)
    if not clean_phone or len(clean_phone) < 10:
        return {'status': 'no_phone', 'detail': 'Invalid phone number format'}

    message_text = (
        f"Hello *{customer_name or 'Valued Customer'}*! 👋\n\n"
        f"Thank you for shopping at *Cobb Pundri* today. We hope you loved our latest collection and had a wonderful experience with us! ✨\n\n"
        f"-----------------------------------\n"
        f"📍 *Store Location:*\n{LOCATION_LINK}\n\n"
        f"⭐ *Leave us a review:*\n{DIRECT_REVIEW_LINK}\n"
        f"-----------------------------------\n\n"
        f"Stay connected with our latest drops:\n"
        f"📸 *Instagram:* {INSTAGRAM_LINK}\n"
        f"👍 *Facebook:* {FACEBOOK_LINK}\n\n"
        f"Warm Regards,\n"
        f"*Parbhat Goyal*\n"
        f"Cobb Pundri"
    )

    payload = {
        'number': clean_phone,
        'message': message_text,
        'mediaPath': MEDIA_FILE
    }
    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(WHATSAPP_SERVER_URL, json=payload, headers=headers, timeout=15)
        try:
            res_data = response.json()
        except Exception:
            res_data = {}

        if response.status_code == 200 and res_data.get('success') is True:
            log_engine(f"[SUCCESS] Regular Bill sent to {clean_phone} ({customer_name})")
            return {'status': 'sent', 'detail': 'Digital bill & review link sent'}
        elif res_data.get('skipped') or 'not registered' in response.text.lower() or 'no lid' in response.text.lower():
            log_engine(f"[SKIPPED] {clean_phone} is not on WhatsApp. Marking as processed.")
            return {'status': 'not_on_whatsapp', 'detail': 'Phone number is not registered on WhatsApp'}
        elif response.status_code == 503 or 'reconnecting' in response.text.lower() or 'not ready' in response.text.lower():
            log_engine(f"[WAITING] WhatsApp client is reconnecting/initializing (503). Retrying when online.")
            return {'status': 'client_not_ready', 'detail': 'WhatsApp client is reconnecting/unready'}
        else:
            log_engine(f"[FAILED] Sender responded: {response.text}")
            return {'status': 'failed', 'detail': f"Sender responded {response.status_code}"}
    except Exception as e:
        log_engine(f"[ERROR] Connecting to WhatsApp sender (port 3000): {e}")
        return {'status': 'client_not_ready', 'detail': str(e)}

def send_exchange_whatsapp_slip(phone_number, customer_name, bill_no, bill_time, net_amount, returned_items, replacement_items):
    """Sends official digital exchange slip for product exchanges."""
    clean_phone = normalize_phone_number(phone_number)
    if not clean_phone or len(clean_phone) < 10:
        return {'status': 'no_phone', 'detail': 'Invalid phone number format'}
    display_mobile = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone

    cust_name = str(customer_name or 'Valued Customer').strip()
    try:
        date_str = bill_time.strftime('%d %b %Y') if bill_time else time.strftime('%d %b %Y')
    except Exception:
        date_str = time.strftime('%d %b %Y')

    # Format returned items
    ret_blocks = []
    for it in returned_items:
        specs = f"Size {it['size']} | Color {it['color']}"
        val_str = f"{int(round(it['net'])):,}"
        ret_blocks.append(
            f"• Article: *{it['article']}*\n"
            f"• Specs: {specs}\n"
            f"• Value Credited: ₹{val_str}\n"
            f"• Reason: Size Mismatch (Too Small)"
        )
    ret_text = "\n\n".join(ret_blocks) if ret_blocks else "• Article: *Returned Item*\n• Specs: Standard\n• Value Credited: ₹0\n• Reason: Size Mismatch"

    # Format replacement items
    rep_blocks = []
    for it in replacement_items:
        val_str = f"{int(round(it['net'])):,}"
        size_str = f" (Size {it['size']})" if it['size'] and it['size'] != 'Standard' else ""
        rep_blocks.append(
            f"• Article: *{it['article']}{size_str}*\n"
            f"• Value: ₹{val_str}"
        )
    if rep_blocks:
        rep_text = "\n\n".join(rep_blocks)
    else:
        rep_text = f"• Article: *Store Exchange Credit Voucher*\n• Value: ₹{abs(int(round(net_amount))):,}"

    # Difference / Settlement calculation
    diff_val = int(round(net_amount))
    if diff_val > 0:
        settlement_line = f"💰 *DIFFERENCE COLLECTED:* +₹{diff_val:,}"
    elif diff_val < 0:
        settlement_line = f"🎟️ *STORE CREDIT ISSUED:* ₹{abs(diff_val):,} (No Cash Refund)"
    else:
        settlement_line = "✅ *EVEN EXCHANGE:* ₹0 Difference"

    message_text = (
        f"🛍️ *COBB ITALY (PUNDRI) — OFFICIAL EXCHANGE SLIP*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"Dear *{cust_name}*,\n"
        f"Your product exchange has been processed successfully! ✨\n\n"
        f"📋 *EXCHANGE DETAILS:*\n"
        f"• Date: {date_str}\n"
        f"• Mobile: {display_mobile}\n\n"
        f"↩️ *RETURNED ITEM:*\n"
        f"{ret_text}\n\n"
        f"✨ *NEW REPLACEMENT ITEM:*\n"
        f"{rep_text}\n\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"{settlement_line}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"📍 *Store Address:*\n"
        f"{STORE_ADDRESS}\n"
        f"🗺️ Store Map: {LOCATION_LINK}\n\n"
        f"⭐ *Rate Your Experience & Leave Us a Google Review:*\n"
        f"{DIRECT_REVIEW_LINK}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━"
    )

    payload = {
        'number': clean_phone,
        'message': message_text
    }
    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(WHATSAPP_SERVER_URL, json=payload, headers=headers, timeout=15)
        try:
            res_data = response.json()
        except Exception:
            res_data = {}

        if response.status_code == 200 and res_data.get('success') is True:
            log_engine(f"[EXCHANGE SUCCESS] Sent slip to {clean_phone} ({cust_name}) for Bill #{bill_no}")
            return {'status': 'sent', 'detail': 'Official Exchange Slip sent'}
        elif res_data.get('skipped') or 'not registered' in response.text.lower() or 'no lid' in response.text.lower():
            log_engine(f"[SKIPPED] {clean_phone} is not on WhatsApp. Marking as processed.")
            return {'status': 'not_on_whatsapp', 'detail': 'Phone number is not registered on WhatsApp'}
        elif response.status_code == 503 or 'reconnecting' in response.text.lower() or 'not ready' in response.text.lower():
            log_engine(f"[WAITING] WhatsApp client is reconnecting/initializing (503). Retrying when online.")
            return {'status': 'client_not_ready', 'detail': 'WhatsApp client is reconnecting/unready'}
        else:
            log_engine(f"[FAILED] Sender responded: {response.text}")
            return {'status': 'failed', 'detail': f"Sender responded {response.status_code}"}
    except Exception as e:
        log_engine(f"[ERROR] Connecting to WhatsApp sender (port 3000): {e}")
        return {'status': 'client_not_ready', 'detail': str(e)}

def run_listener():
    if not get_lock():
        sys.exit(0)
    print(f"[{time.strftime('%X')}] Cobb POS Listener initialized with Automated Exchange Slips.", flush=True)
    
    # Load already sent bill IDs from file
    sent_ids = set()
    if os.path.exists(SENT_BILLS_FILE):
        try:
            with open(SENT_BILLS_FILE, 'r') as f:
                for line in f:
                    val = line.strip()
                    if val:
                        sent_ids.add(val)
            print(f"[{time.strftime('%X')}] Loaded {len(sent_ids)} already sent bills from history.", flush=True)
        except Exception as e:
            print(f"[{time.strftime('%X')}] [HISTORY LOAD ERROR] {e}", flush=True)

    # Load already sent EOD closing date from file
    last_eod_date = ""
    if os.path.exists(SENT_EOD_FILE):
        try:
            with open(SENT_EOD_FILE, 'r') as f:
                last_eod_date = f.read().strip()
            if last_eod_date:
                print(f"[{time.strftime('%X')}] Last EOD closing digest was sent on: {last_eod_date}", flush=True)
        except Exception as e:
            print(f"[{time.strftime('%X')}] [EOD HISTORY LOAD ERROR] {e}", flush=True)

    print(f"[{time.strftime('%X')}] Connecting to database and monitoring for checkouts, exchanges, and 9:30 PM closing digest...", flush=True)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
    except Exception as e:
        print(f"[{time.strftime('%X')}] [INITIAL CONNECTION ERROR] {e}", flush=True)
        return

    # 1. Power-On Recovery: If yesterday's closing digest was never dispatched (e.g. PC turned off early)
    yesterday_date = datetime.date.today() - datetime.timedelta(days=1)
    yesterday_str = yesterday_date.strftime('%Y-%m-%d')
    today_str = datetime.date.today().strftime('%Y-%m-%d')

    if last_eod_date != yesterday_str and last_eod_date != today_str:
        print(f"[{time.strftime('%X')}] [POWER-ON RECOVERY] Verifying if yesterday ({yesterday_str}) closing digest was delivered...", flush=True)
        try:
            cursor.execute(f"SELECT COUNT(CM_ID) FROM CMM01106 WITH (NOLOCK) WHERE CM_TIME >= '{yesterday_str}' AND CM_TIME < CAST(GETDATE() AS DATE) AND CANCELLED = 0")
            y_count = cursor.fetchone()[0] or 0
            if y_count > 0:
                print(f"[{time.strftime('%X')}] [POWER-ON RECOVERY] Found {y_count} bills from yesterday without EOD dispatch. Sending recovered digest now...", flush=True)
                if send_daily_closing_digest(cursor, target_date=yesterday_str, label_suffix=" (Recovered Night Closing)"):
                    last_eod_date = yesterday_str
                    try:
                        with open(SENT_EOD_FILE, 'w') as f:
                            f.write(yesterday_str)
                    except Exception:
                        pass
        except Exception as rec_err:
            print(f"[{time.strftime('%X')}] [RECOVERY ERROR] {rec_err}", flush=True)

    # 2. Windows Shutdown / Logoff Hook (Native Win32 Message Loop + OS signals)
    setup_windows_shutdown_watcher(cursor)

    def on_exit(sig=None, frame=None):
        now = time.localtime()
        # Only check/dispatch EOD during evening closing hours (8:30 PM / 20:30 onwards)
        if (now.tm_hour > 20 or (now.tm_hour == 20 and now.tm_min >= 30)):
            log_engine(f"[PROCESS EXIT DETECTED] Process termination detected at {now.tm_hour}:{now.tm_min:02d}. Checking for unsent EOD digest...")
            try:
                trigger_eod_closing_dispatch(cursor, label_suffix=" (Store Closing Digest)")
            except Exception as e:
                log_engine(f"[EXIT EOD ERROR] {e}")
        if sig is not None:
            sys.exit(0)

    try:
        signal.signal(signal.SIGINT, on_exit)
        signal.signal(signal.SIGTERM, on_exit)
    except Exception:
        pass
    atexit.register(on_exit)

    while True:
        try:
            # 1. Check for Scheduled Store Closing Digest or Evening Inactivity
            now = time.localtime()
            today_str = time.strftime('%Y-%m-%d', now)

            # Evening Closing Schedule:
            # - Trigger A: 9:30 PM (21:30) Scheduled Closing
            # - Trigger B: Inactivity from 8:45 PM (20:45) onward: If bills exist and no new bill for >= 25 mins
            is_night_schedule = (now.tm_hour > 21 or (now.tm_hour == 21 and now.tm_min >= 30))
            is_closing_inactivity = (now.tm_hour > 20 or (now.tm_hour == 20 and now.tm_min >= 45))

            if (is_night_schedule or is_closing_inactivity) and not is_eod_already_sent(today_str):
                try:
                    cursor.execute("""
                        SELECT 
                            COUNT(CM_ID),
                            DATEDIFF(minute, MAX(CM_TIME), GETDATE())
                        FROM CMM01106 WITH (NOLOCK) 
                        WHERE CM_TIME >= CAST(GETDATE() AS DATE) AND CANCELLED = 0
                    """)
                    act_row = cursor.fetchone()
                    t_count = act_row[0] or 0
                    mins_since = act_row[1] if act_row[1] is not None else 999

                    if t_count > 0:
                        should_send = False
                        reason = ""
                        if is_night_schedule:
                            should_send = True
                            reason = f"9:30 PM night closing schedule ({now.tm_hour}:{now.tm_min:02d})"
                        elif is_closing_inactivity and mins_since >= 25:
                            should_send = True
                            reason = f"Evening inactivity ({mins_since}m quiet since last bill at {now.tm_hour}:{now.tm_min:02d})"

                        if should_send:
                            log_engine(f"[{reason.upper()}] Triggering automated EOD closing digest for {today_str} ({t_count} bills)...")
                            if trigger_eod_closing_dispatch(cursor, label_suffix=" (Store Closing Digest)"):
                                last_eod_date = today_str
                except Exception as sched_err:
                    log_engine(f"[SCHEDULED CLOSING CHECK ERROR] {sched_err}")

            # 2. Query all bills in the last 2 days
            query = """
                SELECT 
                    m.CM_ID, m.CM_NO, m.CM_TIME, m.CUSTOMER_CODE, m.CUSTOMER_FNAME, m.NET_AMOUNT,
                    ISNULL(cust.MOBILE, m.CUSTOMER_CODE) as Phone
                FROM VW_CASHMEMO_PRINT_MST m WITH (NOLOCK)
                LEFT JOIN CUSTDYM cust WITH (NOLOCK) ON m.CUSTOMER_CODE = cust.CUSTOMER_CODE
                WHERE m.CM_TIME >= DATEADD(day, -2, GETDATE()) AND m.CANCELLED = 0
                ORDER BY m.CM_TIME ASC
            """
            cursor.execute(query)
            bills = cursor.fetchall()

            for bill in bills:
                cm_id, bill_no, bill_time, cust_code, name, amount, phone = bill
                cm_id_str = str(cm_id).strip()
                res = None  # Reset per bill to prevent stale state leak

                if cm_id_str not in sent_ids:
                    # Check items for this bill to determine if it is an exchange or regular purchase
                    item_query = """
                        SELECT 
                            d.QUANTITY, d.NET, 
                            ISNULL(a.ARTICLE_NAME, 'Exchanged Item') as ArticleName,
                            ISNULL(s.para1_name, 'Standard') as Color,
                            ISNULL(s.para2_name, 'Standard') as Size
                        FROM CMD01106 d WITH (NOLOCK)
                        JOIN SKU c WITH (NOLOCK) ON d.PRODUCT_CODE = c.PRODUCT_CODE
                        JOIN ARTICLE a WITH (NOLOCK) ON c.ARTICLE_CODE = a.ARTICLE_CODE
                        LEFT JOIN SKU_NAMES s WITH (NOLOCK) ON d.PRODUCT_CODE = s.product_Code
                        WHERE d.CM_ID = ?
                    """
                    cursor.execute(item_query, (cm_id,))
                    item_rows = cursor.fetchall()

                    returned_items = []
                    replacement_items = []

                    for row in item_rows:
                        qty = float(row[0] or 0)
                        net_val = float(row[1] or 0)
                        art_name = str(row[2] or 'Exchanged Item').strip()
                        color = str(row[3] or 'Standard').strip()
                        size = str(row[4] or 'Standard').strip()
                        if qty < 0:
                            returned_items.append({
                                'qty': abs(qty),
                                'net': abs(net_val),
                                'article': art_name,
                                'color': color,
                                'size': size
                            })
                        elif qty > 0:
                            replacement_items.append({
                                'qty': qty,
                                'net': net_val,
                                'article': art_name,
                                'color': color,
                                'size': size
                            })

                    is_exchange = len(returned_items) > 0
                    success = False

                    clean_phone = normalize_phone_number(phone)
                    display_phone = clean_phone[-10:] if len(clean_phone) >= 10 else str(phone or '')

                    if not clean_phone or len(clean_phone) < 10:
                        log_engine(f"[SKIPPED] No valid phone attached to bill #{bill_no}")
                        record_dispatch_event(bill_no, cm_id_str, name, phone, 'exchange' if is_exchange else 'checkout', 'no_phone', 'No valid phone attached to invoice')
                        success = True
                    elif is_exchange:
                        log_engine(f"[NEW EXCHANGE DETECTED] Bill #{bill_no} | Phone: {clean_phone} | Returned: {len(returned_items)} | Replaced: {len(replacement_items)}")
                        res = send_exchange_whatsapp_slip(clean_phone, name, bill_no, bill_time, amount, returned_items, replacement_items)
                        if res.get('status') == 'client_not_ready':
                            log_engine(f"[GATEWAY WAITING] WhatsApp Client is reconnecting. Will retry Bill #{bill_no} once gateway is ready.")
                            break
                        record_dispatch_event(bill_no, cm_id_str, name, display_phone, 'exchange', res['status'], res['detail'])
                        success = res['status'] in ('sent', 'not_on_whatsapp')
                    else:
                        log_engine(f"[NEW BILL DETECTED] Bill #{bill_no} | Rs.{amount} | Phone: {clean_phone}")
                        res = send_whatsapp_message(clean_phone, name)
                        if res.get('status') == 'client_not_ready':
                            log_engine(f"[GATEWAY WAITING] WhatsApp Client is reconnecting. Will retry Bill #{bill_no} once gateway is ready.")
                            break
                        record_dispatch_event(bill_no, cm_id_str, name, display_phone, 'checkout', res['status'], res['detail'])
                        success = res['status'] in ('sent', 'not_on_whatsapp')

                    if success:
                        # Mark as processed in memory and write to history file
                        sent_ids.add(cm_id_str)
                        try:
                            with open(SENT_BILLS_FILE, 'a') as f:
                                f.write(cm_id_str + "\n")
                            # Add phone to our local database for marketing if on whatsapp
                            if clean_phone and len(clean_phone) >= 10 and (res.get('status') == 'sent' if res and isinstance(res, dict) else False):
                                customer_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "customer_numbers.txt")
                                with open(customer_file, 'a') as cf:
                                    cf.write(clean_phone + "\n")
                        except Exception as file_err:
                            log_engine(f"[LOG FILE WRITE ERROR] {file_err}")

        except pyodbc.Error as db_err:
            print(f"[{time.strftime('%X')}] [DB ERROR] SQL connection interrupted: {db_err}. Initiating auto-recovery...", flush=True)
            for attempt in range(1, 6):
                time.sleep(3)
                try:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    print(f"[{time.strftime('%X')}] [DB RECOVERED] Database connection restored successfully on attempt {attempt}.", flush=True)
                    break
                except Exception as rec_err:
                    print(f"[{time.strftime('%X')}] [DB RETRY {attempt}/5] Still attempting reconnect...", flush=True)
        except Exception as e:
            print(f"[{time.strftime('%X')}] [LOOP ERROR] {e}. Resuming in 3s...", flush=True)

        time.sleep(5)

if __name__ == '__main__':
    run_listener()