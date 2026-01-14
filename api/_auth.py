import os
import base64


def is_authorized(headers):
    user = os.getenv("BASIC_AUTH_USER")
    password = os.getenv("BASIC_AUTH_PASS")

    # Als er geen env vars gezet zijn, laten we alles door (handig voor lokale dev).
    if not user or not password:
        return True

    if not headers:
        return False

    auth = headers.get("authorization") or headers.get("Authorization")
    if not auth or not auth.startswith("Basic "):
        return False

    encoded = auth.split(" ", 1)[1].strip()
    try:
        decoded = base64.b64decode(encoded).decode("utf-8")
    except Exception:
        return False

    if ":" not in decoded:
        return False

    u, p = decoded.split(":", 1)
    return u == user and p == password


def send_unauthorized(handler):
    """
    Belangrijk:
    - GEEN 'WWW-Authenticate' header zetten.
      Die header triggert de browser/Google login popup.
    - We zetten WEL een eigen header zodat de frontend weet:
      dit is een Basic-Auth-401 (dus écht fout gebruikersnaam/wachtwoord).
    """
    handler.send_response(401)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")

    # ✅ Dit is de “label”: hiermee herkennen we “echte login fout”
    handler.send_header("X-Auth-Reason", "basic")

    handler.end_headers()
    handler.wfile.write(b'{"error":"unauthorized"}')
