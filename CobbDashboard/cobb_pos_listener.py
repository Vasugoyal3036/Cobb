import time
import requests
import pyodbc
import sys
import os
import socket

# Ensure UTF-8 output on Windows console
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def get_lock():
    get_lock._lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
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
            print(f"[{time.strftime('%X')}] [SUCCESS] Regular Bill sent to {clean_phone} ({customer_name})", flush=True)
            return True
        elif response.status_code == 400 and 'not registered' in response.text.lower():
            print(f"[{time.strftime('%X')}] [SKIPPED] {clean_phone} is not on WhatsApp. Marking as processed.", flush=True)
            return True
        else:
            print(f"[{time.strftime('%X')}] [FAILED] Sender responded: {response.text}", flush=True)
            return False
    except Exception as e:
        print(f"[{time.strftime('%X')}] [ERROR] Connecting to WhatsApp sender (port 3000): {e}", flush=True)
        return False

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
        f"{rep_text}\n"
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
            print(f"[{time.strftime('%X')}] [EXCHANGE SUCCESS] Sent slip to {clean_phone} ({cust_name}) for Bill #{bill_no}", flush=True)
            return True
        elif response.status_code == 400 and 'not registered' in response.text.lower():
            print(f"[{time.strftime('%X')}] [SKIPPED] {clean_phone} is not on WhatsApp. Marking as processed.", flush=True)
            return True
        else:
            print(f"[{time.strftime('%X')}] [FAILED] Sender responded: {response.text}", flush=True)
            return False
    except Exception as e:
        print(f"[{time.strftime('%X')}] [ERROR] Connecting to WhatsApp sender (port 3000): {e}", flush=True)
        return False

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

    print(f"[{time.strftime('%X')}] Connecting to database and monitoring for new checkouts and exchanges...", flush=True)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
    except Exception as e:
        print(f"[{time.strftime('%X')}] [INITIAL CONNECTION ERROR] {e}", flush=True)
        return

    while True:
        try:
            # Query all bills in the last 2 days
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
                        print(f"[{time.strftime('%X')}] [SKIPPED] No valid phone attached to bill #{bill_no}", flush=True)
                        success = True
                    elif is_exchange:
                        print(f"[{time.strftime('%X')}] [NEW EXCHANGE DETECTED] Bill #{bill_no} | Phone: {phone} | Returned: {len(returned_items)} | Replaced: {len(replacement_items)}", flush=True)
                        success = send_exchange_whatsapp_slip(phone, name, bill_no, bill_time, amount, returned_items, replacement_items)
                    else:
                        print(f"[{time.strftime('%X')}] [NEW BILL DETECTED] Bill #{bill_no} | Rs.{amount} | Phone: {phone}", flush=True)
                        success = send_whatsapp_message(phone, name)

                    if success:
                        # Mark as processed in memory and write to history file
                        sent_ids.add(cm_id_str)
                        try:
                            with open(SENT_BILLS_FILE, 'a') as f:
                                f.write(cm_id_str + "\n")
                            # Add phone to our local database for marketing
                            if phone and len(str(phone).strip()) >= 10:
                                clean_phone = ''.join(filter(str.isdigit, str(phone)))
                                customer_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "customer_numbers.txt")
                                with open(customer_file, 'a') as cf:
                                    cf.write(clean_phone + "\n")
                        except Exception as file_err:
                            print(f"[{time.strftime('%X')}] [LOG FILE WRITE ERROR] {file_err}", flush=True)

        except pyodbc.Error as db_err:
            print(f"[{time.strftime('%X')}] [DB ERROR] Reconnecting... ({db_err})", flush=True)
            time.sleep(5)
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
            except Exception:
                pass
        except Exception as e:
            print(f"[{time.strftime('%X')}] [LOOP ERROR] {e}", flush=True)

        time.sleep(5)

if __name__ == '__main__':
    run_listener()