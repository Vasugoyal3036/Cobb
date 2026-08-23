import time
import requests
import pyodbc
import sys
import os

# Configuration
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
    for d in ['ODBC Driver 18 for SQL Server', 'ODBC Driver 17 for SQL Server', 'SQL Server']:
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
            print(f"[{time.strftime('%X')}] [SUCCESS] Sent to {clean_phone} ({customer_name})", flush=True)
        else:
            print(f"[{time.strftime('%X')}] [FAILED] Sender responded: {response.text}", flush=True)
    except Exception as e:
        print(f"[{time.strftime('%X')}] [ERROR] Connecting to WhatsApp sender (port 3000): {e}", flush=True)

def run_listener():
    print(f"[{time.strftime('%X')}] Cobb POS Listener initialized.", flush=True)
    
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

    print(f"[{time.strftime('%X')}] Connecting to database and monitoring for new checkouts...", flush=True)

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
                SELECT CM_ID, CM_NO, CUSTOMER_CODE, CUSTOMER_FNAME, NET_AMOUNT
                FROM VW_CASHMEMO_PRINT_MST
                WHERE CM_TIME >= DATEADD(day, -2, GETDATE()) AND CANCELLED = 0
                ORDER BY CM_TIME ASC
            """
            cursor.execute(query)
            bills = cursor.fetchall()

            for bill in bills:
                cm_id, bill_no, phone, name, amount = bill
                cm_id_str = str(cm_id).strip()

                if cm_id_str not in sent_ids:
                    print(f"[{time.strftime('%X')}] [NEW BILL DETECTED] Bill #{bill_no} | Rs.{amount} | Phone: {phone}", flush=True)
                    
                    if phone and len(str(phone).strip()) >= 10:
                        send_whatsapp_message(phone, name)
                    else:
                        print(f"[{time.strftime('%X')}] [SKIPPED] No valid phone attached to bill #{bill_no}", flush=True)

                    # Mark as processed in memory and write to history file
                    sent_ids.add(cm_id_str)
                    try:
                        with open(SENT_BILLS_FILE, 'a') as f:
                            f.write(cm_id_str + "\n")
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