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
        events.append(event)
        if len(events) > 500:
            events = events[-500:]
        with open(DISPATCHES_FILE, 'w', encoding='utf-8') as f:
            json.dump(events, f, indent=2)
    except Exception as e:
        log_engine(f"[DISPATCH RECORD ERROR] {e}")

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
            f"• 📱 UPI / Online: *₹{upi:,}*\n"
            f"• 💳 Card (POS Swipe): *₹{card:,}*\n\n"
            f"🔄 *EXCHANGES & REPLACEMENTS:*\n"
            f"• Exchange Bills Handled: *{exch_bills}*\n"
            f"• Total Returned Merchandise: *₹{exch_value:,}*\n"
            f"• Net Upsell Collected: *{upsell_sign}₹{exch_upsell:,}*\n\n"
            f"🏆 *TOP PERFORMING CATEGORY:*\n"
            f"• Best Seller: *{top_cat_name}* ({top_cat_units} units sold)\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"✨ Automated EOD Store Intelligence System"
        )

        delivered_count = 0
        for num in EOD_RECIPIENTS:
            clean_phone = ''.join(filter(str.isdigit, str(num)))
            if len(clean_phone) == 10:
                clean_phone = f"91{clean_phone}"
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
    clean_phone = ''.join(filter(str.isdigit, str(phone_number)))
    if len(clean_phone) == 10:
        clean_phone = f"91{clean_phone}"

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
        if response.status_code == 200:
            log_engine(f"[SUCCESS] Regular Bill sent to {clean_phone} ({customer_name})")
            return {'status': 'sent', 'detail': 'Digital bill & review link sent'}
        elif response.status_code == 400 and 'not registered' in response.text.lower():
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
    clean_phone = ''.join(filter(str.isdigit, str(phone_number)))
    if len(clean_phone) == 10:
        clean_phone = f"91{clean_phone}"
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
        if response.status_code == 200:
            log_engine(f"[EXCHANGE SUCCESS] Sent slip to {clean_phone} ({cust_name}) for Bill #{bill_no}")
            return {'status': 'sent', 'detail': 'Official Exchange Slip sent'}
        elif response.status_code == 400 and 'not registered' in response.text.lower():
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

    # 2. Windows Shutdown / Logoff Hook (Detects shutdown near 8:00 PM or store closing)
    def on_exit(sig=None, frame=None):
        now = time.localtime()
        cur_today = time.strftime('%Y-%m-%d', now)
        # If shutdown happens near 8:00 PM (anytime from 7:30 PM onwards) and today's digest wasn't sent yet
        if (now.tm_hour > 19 or (now.tm_hour == 19 and now.tm_min >= 30)) and last_eod_date != cur_today:
            print(f"[{time.strftime('%X')}] [SHUTDOWN DETECTED] Counter PC shutdown detected at {now.tm_hour}:{now.tm_min:02d}. Dispatching EOD digest now...", flush=True)
            try:
                if send_daily_closing_digest(cursor, label_suffix=" (Store Closing Digest)"):
                    with open(SENT_EOD_FILE, 'w') as f:
                        f.write(cur_today)
            except Exception as e:
                print(f"[{time.strftime('%X')}] [SHUTDOWN EOD ERROR] {e}", flush=True)
        sys.exit(0)

    try:
        signal.signal(signal.SIGINT, on_exit)
        signal.signal(signal.SIGTERM, on_exit)
    except Exception:
        pass
    atexit.register(on_exit)

    while True:
        try:
            # 1. Check for Scheduled 9:00 PM Store Closing Digest (if PC is on)
            now = time.localtime()
            today_str = time.strftime('%Y-%m-%d', now)
            if now.tm_hour >= 21 and last_eod_date != today_str:
                print(f"[{time.strftime('%X')}] [9:00 PM CLOSING] Clock reached 9:00 PM. Generating and sending automated EOD digest to owners...", flush=True)
                if send_daily_closing_digest(cursor, label_suffix=" (Store Closing Digest)"):
                    last_eod_date = today_str
                    try:
                        with open(SENT_EOD_FILE, 'w') as f:
                            f.write(today_str)
                    except Exception as file_err:
                        print(f"[{time.strftime('%X')}] [SENT EOD LOG ERROR] {file_err}", flush=True)

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

                    if not phone or len(str(phone).strip()) < 10:
                        log_engine(f"[SKIPPED] No valid phone attached to bill #{bill_no}")
                        record_dispatch_event(bill_no, cm_id_str, name, phone, 'exchange' if is_exchange else 'checkout', 'no_phone', 'No valid phone attached to invoice')
                        success = True
                    elif is_exchange:
                        log_engine(f"[NEW EXCHANGE DETECTED] Bill #{bill_no} | Phone: {phone} | Returned: {len(returned_items)} | Replaced: {len(replacement_items)}")
                        res = send_exchange_whatsapp_slip(phone, name, bill_no, bill_time, amount, returned_items, replacement_items)
                        if res.get('status') == 'client_not_ready':
                            log_engine(f"[GATEWAY WAITING] WhatsApp Client is reconnecting. Will retry Bill #{bill_no} once gateway is ready.")
                            break
                        record_dispatch_event(bill_no, cm_id_str, name, phone, 'exchange', res['status'], res['detail'])
                        success = res['status'] in ('sent', 'not_on_whatsapp')
                    else:
                        log_engine(f"[NEW BILL DETECTED] Bill #{bill_no} | Rs.{amount} | Phone: {phone}")
                        res = send_whatsapp_message(phone, name)
                        if res.get('status') == 'client_not_ready':
                            log_engine(f"[GATEWAY WAITING] WhatsApp Client is reconnecting. Will retry Bill #{bill_no} once gateway is ready.")
                            break
                        record_dispatch_event(bill_no, cm_id_str, name, phone, 'checkout', res['status'], res['detail'])
                        success = res['status'] in ('sent', 'not_on_whatsapp')

                    if success:
                        # Mark as processed in memory and write to history file
                        sent_ids.add(cm_id_str)
                        try:
                            with open(SENT_BILLS_FILE, 'a') as f:
                                f.write(cm_id_str + "\n")
                            # Add phone to our local database for marketing if on whatsapp
                            if phone and len(str(phone).strip()) >= 10 and (res.get('status') == 'sent' if 'res' in locals() and isinstance(res, dict) else False):
                                clean_phone = ''.join(filter(str.isdigit, str(phone)))
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