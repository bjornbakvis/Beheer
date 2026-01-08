import os
import base64


def _unauthorized_response():
    """
    Belangrijk:
    - GEEN 'WWW-Authenticate' header!
    - Anders krijg je die browser/Google popup.
    """
    return {
        "statusCode": 401,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
        },
        "body": '{"error":"unauthorized"}',
    }


def is_authorized(headers):
    """
    Verwacht Basic Auth header:
      Authorization: Basic base64(user:pass)

    Als BASIC_AUTH_USER/PASS niet gezet zijn -> allow (handig voor dev).
    """
    user = os.getenv("BASIC_AUTH_USER")
    password = os.getenv("BASIC_AUTH_PASS")

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


def require_auth(headers):
    """
    Helper voor endpoints:
    - return None als authorized
    - return een 401 response dict als niet authorized (zonder WWW-Authenticate)
    """
    if is_authorized(headers):
        return None
    return _unauthorized_response()
