from http.server import BaseHTTPRequestHandler
from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlparse
import httpx
import json
import os
import sys
import time

current_dir = os.path.dirname(__file__)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from _auth import is_authorized, send_unauthorized

# Cache bearer token between requests to reduce token calls
token_cache = {
    "production": {"token": None, "expires_at": None},
    "acceptance": {"token": None, "expires_at": None},
}

# Kinetic OAuth / hosts
DEFAULT_KINETIC_HOST = os.getenv("KINETIC_HOST", "https://kinetic.private-insurance.eu")
DEFAULT_CLIENT_ID = os.getenv("KINETIC_CLIENT_ID")
DEFAULT_CLIENT_SECRET = os.getenv("KINETIC_CLIENT_SECRET")

ACCEPTANCE_KINETIC_HOST = os.getenv("KINETIC_HOST_ACCEPTANCE", DEFAULT_KINETIC_HOST)
ACCEPTANCE_CLIENT_ID = os.getenv("KINETIC_CLIENT_ID_ACCEPTANCE", DEFAULT_CLIENT_ID)
ACCEPTANCE_CLIENT_SECRET = os.getenv("KINETIC_CLIENT_SECRET_ACCEPTANCE", DEFAULT_CLIENT_SECRET)

# Contract base path (configurable)
DEFAULT_CONTRACT_BASE_PATH = os.getenv("KINETIC_CONTRACT_BASE_PATH", "/contract/api/v1")
ACCEPTANCE_CONTRACT_BASE_PATH = os.getenv(
    "KINETIC_CONTRACT_BASE_PATH_ACCEPTANCE", DEFAULT_CONTRACT_BASE_PATH
)

# DIAS header values
DEFAULT_TENANT_CUSTOMER_ID = os.getenv("DIAS_TENANT_CUSTOMER_ID", "")
DEFAULT_BEDRIJF_ID = os.getenv("DIAS_BEDRIJF_ID", "")
DEFAULT_MEDEWERKER_ID = os.getenv("DIAS_MEDEWERKER_ID", "")
DEFAULT_KANTOOR_ID = os.getenv("DIAS_KANTOOR_ID", "")

ACCEPTANCE_TENANT_CUSTOMER_ID = os.getenv(
    "DIAS_TENANT_CUSTOMER_ID_ACCEPTANCE", DEFAULT_TENANT_CUSTOMER_ID
)
ACCEPTANCE_BEDRIJF_ID = os.getenv("DIAS_BEDRIJF_ID_ACCEPTANCE", DEFAULT_BEDRIJF_ID)
ACCEPTANCE_MEDEWERKER_ID = os.getenv(
    "DIAS_MEDEWERKER_ID_ACCEPTANCE", DEFAULT_MEDEWERKER_ID
)
ACCEPTANCE_KANTOOR_ID = os.getenv("DIAS_KANTOOR_ID_ACCEPTANCE", DEFAULT_KANTOOR_ID)

# Step 2: split/longer timeouts for upstream
UPSTREAM_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)


def get_env_config(env_key):
    if env_key == "acceptance":
        return {
            "host": ACCEPTANCE_KINETIC_HOST,
            "client_id": ACCEPTANCE_CLIENT_ID,
            "client_secret": ACCEPTANCE_CLIENT_SECRET,
            "contract_base_path": ACCEPTANCE_CONTRACT_BASE_PATH,
            "tenant_customer_id": ACCEPTANCE_TENANT_CUSTOMER_ID,
            "bedrijf_id": ACCEPTANCE_BEDRIJF_ID,
            "medewerker_id": ACCEPTANCE_MEDEWERKER_ID,
            "kantoor_id": ACCEPTANCE_KANTOOR_ID,
        }
    return {
        "host": DEFAULT_KINETIC_HOST,
        "client_id": DEFAULT_CLIENT_ID,
        "client_secret": DEFAULT_CLIENT_SECRET,
        "contract_base_path": DEFAULT_CONTRACT_BASE_PATH,
        "tenant_customer_id": DEFAULT_TENANT_CUSTOMER_ID,
        "bedrijf_id": DEFAULT_BEDRIJF_ID,
        "medewerker_id": DEFAULT_MEDEWERKER_ID,
        "kantoor_id": DEFAULT_KANTOOR_ID,
    }


def get_bearer_token(env_key="production"):
    cache = token_cache.get(env_key, token_cache["production"])
    if cache["token"] and cache["expires_at"] and datetime.now() < cache["expires_at"]:
        return cache["token"]

    config = get_env_config(env_key)
    if not config["client_id"] or not config["client_secret"]:
        raise RuntimeError(
            f"KINETIC_CLIENT_ID or KINETIC_CLIENT_SECRET is not set for {env_key}"
        )

    token_url = f"{config['host'].rstrip('/')}/token"

    # Step 1: timing + URL log (no secrets)
    t0 = time.time()
    print("TOKEN_URL=", token_url)
    print("TOKEN_START_TS=", t0)

    with httpx.Client() as client:
        response = client.post(
            token_url,
            params={
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
            },
            timeout=UPSTREAM_TIMEOUT,
        )
        response.raise_for_status()

        t1 = time.time()
        print("TOKEN_STATUS=", response.status_code, "DURATION_S=", round(t1 - t0, 3))

        data = response.json()
        token = data.get("access_token")
        expires_in = int(data.get("expires_in", 3600))

        if not token:
            raise RuntimeError("Bearer token missing from token response")

        cache["token"] = token
        cache["expires_at"] = datetime.now() + timedelta(
            seconds=max(expires_in - 300, 60)
        )
        return token


def _dias_headers(config, token):
    missing = []
    for key in ("tenant_customer_id", "bedrijf_id", "medewerker_id", "kantoor_id"):
        if not str(config.get(key, "")).strip():
            missing.append(key)

    if missing:
        raise RuntimeError(
            "Missing DIAS env vars: "
            + ", ".join(missing)
            + " (set DIAS_* and optionally DIAS_*_ACCEPTANCE)"
        )

    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Tenant-CustomerId": str(config["tenant_customer_id"]),
        "BedrijfId": str(config["bedrijf_id"]),
        "MedewerkerId": str(config["medewerker_id"]),
        "KantoorId": str(config["kantoor_id"]),
    }


def _products_url(config):
    host = (config.get("host") or "").rstrip("/")
    base = (config.get("contract_base_path") or "").strip("/")
    if not host:
        raise RuntimeError("KINETIC_HOST is empty")
    if not base:
        raise RuntimeError("KINETIC_CONTRACT_BASE_PATH is empty")
    return f"{host}/{base}/contracten/verzekeringen/productdefinities"


def fetch_products(config, token):
    url = _products_url(config)

    # Step 1: timing + URL log (no secrets)
    t0 = time.time()
    print("PRODUCTS_UPSTREAM_URL=", url)
    print("PRODUCTS_START_TS=", t0)

    with httpx.Client() as client:
        response = client.get(
            url,
            params={
                "AlleenLopendProduct": "true",
                "IsBeschikbaarVoorAgent": "true",
                "IsBeschikbaarVoorKlant": "true",
                "IsBeschikbaarVoorMedewerker": "true",
            },
            headers=_dias_headers(config, token),
            timeout=UPSTREAM_TIMEOUT,
        )
        response.raise_for_status()

        t1 = time.time()
        print(
            "PRODUCTS_UPSTREAM_STATUS=",
            response.status_code,
            "DURATION_S=",
            round(t1 - t0, 3),
        )

        data = response.json()

        if isinstance(data, list):
            items = data
        elif isinstance(data, dict) and "data" in data:
            items = data["data"]
        elif isinstance(data, dict) and "items" in data:
            items = data["items"]
        else:
            items = [data] if data else []

        return {"products": items, "count": len(items)}


def fetch_product_detail(config, token, product_id):
    base_url = _products_url(config).rstrip("/")
    url = f"{base_url}/{product_id}"

    t0 = time.time()
    print("PRODUCT_DETAIL_UPSTREAM_URL=", url)
    print("PRODUCT_DETAIL_START_TS=", t0)

    with httpx.Client() as client:
        response = client.get(
            url,
            headers=_dias_headers(config, token),
            timeout=UPSTREAM_TIMEOUT,
        )
        response.raise_for_status()

        t1 = time.time()
        print(
            "PRODUCT_DETAIL_UPSTREAM_STATUS=",
            response.status_code,
            "DURATION_S=",
            round(t1 - t0, 3),
        )
        return response.json()


class handler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status_code=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)

        # Backend fix: always JSON + prevent cache/304 behavior
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")

        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            if not is_authorized(self.headers):
                send_unauthorized(self)
                return

            parsed = urlparse(self.path)
            parts = [p for p in parsed.path.split("/") if p]
            query_params = parse_qs(parsed.query or "")

            env_param = query_params.get("env", ["production"])[0]
            env_key = "acceptance" if env_param == "acceptance" else "production"

            config = get_env_config(env_key)
            token = get_bearer_token(env_key)

            product_id = query_params.get("productId", [None])[0]
            if (
                not product_id
                and len(parts) >= 3
                and parts[0] == "api"
                and parts[1] == "products"
            ):
                product_id = parts[2] if parts[2] else None

            if product_id:
                data = fetch_product_detail(config, token, product_id)
                self._send_json(data, status_code=200)
            else:
                data = fetch_products(config, token)
                self._send_json(data, status_code=200)

        except httpx.HTTPStatusError as exc:
            self._send_json(
                {
                    "error": "Upstream request failed",
                    "status_code": exc.response.status_code,
                    "message": exc.response.text,
                },
                status_code=exc.response.status_code,
            )
        except Exception as exc:
            self._send_json({"error": str(exc)}, status_code=500)
