import os
import base64
import hmac


def is_authorized(headers):
    user = os.getenv("BASIC_AUTH_USER")
    password = os.getenv("BASIC_AUTH_PASS")

    # Op Vercel is VERCEL_ENV meestal: production / preview / development
    vercel_env = (os.getenv("VERCEL_ENV") or "").lower()
    is_prod = vercel_env == "production"

    # Als env vars ontbreken:
    # - production: NIET doorlaten
    # - development/preview/lokaal: WEL doorlaten (handig tijdens bouwen)
    if not user or not password:
        return False if is_prod else True

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

    # compare_digest voorkomt timing-leaks
    return hmac.compare_digest(u, user) and hmac.compare_digest(p, password)
