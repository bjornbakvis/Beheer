from http.server import BaseHTTPRequestHandler
from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlparse
import httpx
import json
import os
import sys
import uuid

current_dir = os.path.dirname(__file__)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from _auth import is_authorized, send_unauthorized

# Cache bearer token between requests to reduce token calls
token_cache = {
    "production": {"token": None, "expires_at": None},
    "acceptance": {"token": None, "expires_at": None},
}

DEFAULT_KINETIC_HOST = os.getenv("KINETIC_HOST", "https://dcb.sleutelstadassuradeuren.nl")
DEFAULT_CLIENT_ID = os.getenv("KINETIC_CLIENT_ID")
DEFAULT_CLIENT_SECRET = os.getenv("KINETIC_CLIENT_SECRET")

ACCEPTANCE_KINETIC_HOST = os.getenv("KINETIC_HOST_ACCEPTANCE", DEFAULT_KINETIC_HOST)
ACCEPTANCE_CLIENT_ID = os.getenv("KINETIC_CLIENT_ID_ACCEPTANCE", DEFAULT_CLIENT_ID)
ACCEPTANCE_CLIENT_SECRET = os.getenv("KINETIC_CLIENT_SECRET_ACCEPTANCE", DEFAULT_CLIENT_SECRET)

# DIAS tenant/company headers (maak deze in Vercel aan!)
DEFAULT_TENANT_CUSTOMER_ID = os.getenv("DIAS_TENANT_CUSTOMER_ID", "")
DEFAULT_BEDRIJF_ID = os.getenv("DIAS_BEDRIJF_ID", "")

ACCEPTANCE_TENANT_CUSTOMER_ID = os.getenv(
    "DIAS_TENANT_CUSTOMER_ID_ACCEPTANCE", DEFAULT_TENANT_CUSTOMER_ID
)
ACCEPTANCE_BEDRIJF_ID = os.getenv("DIAS_BEDRIJF_ID_ACCEPTANCE", DEFAULT_BEDRIJF_ID)


def get_env_config(env_key: str):
    if env_key == "acceptance":
        return {
            "host": ACCEPTANCE_KINETIC_HOST,
            "client_id": ACCEPTANCE_CLIENT_ID,
            "client_secret": ACCEPTANCE_CLIENT_SECRET,
            "tenant_customer_id": ACCEPTANCE_TENANT_CUSTOMER_ID,
            "bedrijf_id": ACCEPTANCE_BEDRIJF_ID,
        }
    return {
        "host": DEFAULT_KINETIC_HOST,
        "client_id": DEFAULT_CLIENT_ID,
        "client_secret": DEFAULT_CLIENT_SECRET,
        "tenant_customer_id": DEFAULT_TENANT_CUSTOMER_ID,
        "bedrijf_id": DEFAULT_BEDRIJF_ID,
    }


def get_bearer_token(env_key: str = "production") -> str:
    cache = token_cache.get(env_key, token_cache["production"])
    if cache["token"] and cache["expires_at"] and datetime.now() < cache["expires_at"]:
        return cache["token"]

    config = get_env_config(env_key)
    if not config["client_id"] or not config["client_secret"]:
        raise RuntimeError(f"KINETIC_CLIENT_ID/SECRET ontbreekt voor env={env_key}")

    with httpx.Client() as client:
        resp = client.post(
            f"{config['host'].rstrip('/')}/token",
            params={
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
            },
            timeout=30.0,
        )
        resp.raise_for_status()

        data = resp.json()
        token = data.get("access_token")
        expires_in = int(data.get("expires_in", 3600))

        if not token:
            raise RuntimeError("Bearer token ontbreekt in token response")

        cache["token"] = token
        cache["expires_at"] = datetime.now() + timedelta(seconds=max(expires_in - 300, 60))
        return token


def _dias_headers(config: dict, token: str) -> dict:
    if not config.get("tenant_customer_id") or not config.get("bedrijf_id"):
        raise RuntimeError(
            "DIAS_TENANT_CUSTOMER_ID / DIAS_BEDRIJF_ID ontbreekt (zet env vars in Vercel)"
        )
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Tenant-CustomerId": str(config["tenant_customer_id"]),
        "BedrijfId": str(config["bedrijf_id"]),
    }


def fetch_rules(config: dict, token: str):
    with httpx.Client() as client:
        resp = client.get(
            f"{config['host'].rstrip('/')}/beheer/api/v1/administratie/assurantie/regels/acceptatieregels",
            headers=_dias_headers(config, token),
            timeout=30.0,
        )
        resp.raise_for_status()

        data = resp.json()
        if isinstance(data, list):
            rules = data
        elif isinstance(data, dict) and "data" in data:
            rules = data["data"]
        elif isinstance(data, dict) and "rules" in data:
            rules = data["rules"]
        else:
            rules = [data] if data else []

        return {"rules": rules, "count": len(rules)}


def fetch_rule_detail(config: dict, token: str, regel_id: str):
    with httpx.Client() as client:
        resp = client.get(
            f"{config['host'].rstrip('/')}/beheer/api/v1/administratie/assurantie/regels/acceptatieregels/{regel_id}",
            headers=_dias_headers(config, token),
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()


def delete_rule(config: dict, token: str, regel_id: str):
    with httpx.Client() as client:
        resp = client.delete(
            f"{config['host'].rstrip('/')}/beheer/api/v1/administratie/assurantie/regels/acceptatieregels/{regel_id}",
            headers=_dias_headers(config, token),
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json() if resp.content else {"status": "deleted"}


def create_rule(config: dict, token: str, payload: dict):
    with httpx.Client() as client:
        resp = client.put(
            f"{config['host'].rstrip('/')}/beheer/api/v1/administratie/assurantie/regels/acceptatieregels/invoeren",
            headers=_dias_headers(config, token),
            json=payload,
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json() if resp.content else {"status": "created"}


def update_rule(config: dict, token: str, payload: dict):
    with httpx.Client() as client:
        resp = client.put(
            f"{config['host'].rstrip('/')}/beheer/api/v1/administratie/assurantie/regels/acceptatieregels/wijzigen",
            headers=_dias_headers(config, token),
            json=payload,
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json() if resp.content else {"status": "updated"}


class handler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status_code: int = 200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)

        # ✅ Backend fix: voorkom 304/ETag gedoe en garandeer JSON
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Vary", "Origin")

        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        # Handig voor CORS preflight in dev
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization,Content-Type")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.end_headers()

    def _env_key(self):
        parsed = urlparse(self.path)
        query_params = parse_qs(parsed.query or "")
        env_param = query_params.get("env", ["production"])[0]
        return "acceptance" if env_param == "acceptance" else "production"

    def _regel_id(self):
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        query_params = parse_qs(parsed.query or "")

        regel_id = query_params.get("regelId", [None])[0]
        if not regel_id and len(parts) >= 3 and parts[0] == "api" and parts[1] == "acceptance-rules":
            regel_id = parts[2] or None
        return regel_id

    def do_GET(self):
        try:
            if not is_authorized(self.headers):
                send_unauthorized(self)
                return

            env_key = self._env_key()
            config = get_env_config(env_key)
            token = get_bearer_token(env_key)

            regel_id = self._regel_id()
            data = fetch_rule_detail(config, token, regel_id) if regel_id else fetch_rules(config, token)

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

    def do_DELETE(self):
        try:
            if not is_authorized(self.headers):
                send_unauthorized(self)
                return

            env_key = self._env_key()
            config = get_env_config(env_key)
            token = get_bearer_token(env_key)

            regel_id = self._regel_id()
            if not regel_id:
                self._send_json({"error": "regelId is required"}, status_code=400)
                return

            data = delete_rule(config, token, regel_id)
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

    def do_PUT(self):
        try:
            if not is_authorized(self.headers):
                send_unauthorized(self)
                return

            env_key = self._env_key()
            config = get_env_config(env_key)
            token = get_bearer_token(env_key)

            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else ""
            body = json.loads(raw_body) if raw_body else {}

            afd_code = body.get("AfdBrancheCodeId")
            omschrijving = body.get("Omschrijving")
            expressie = body.get("Expressie")
            regel_id = body.get("RegelId")
            resource_id = body.get("ResourceId") or str(uuid.uuid4())

            if regel_id is not None:
                if expressie is None or omschrijving is None:
                    self._send_json(
                        {"error": "RegelId, Omschrijving, and Expressie are required"},
                        status_code=400,
                    )
                    return
                payload = {
                    "RegelId": regel_id,
                    "Omschrijving": omschrijving,
                    "Expressie": expressie,
                    "ResourceId": resource_id,
                }
                data = update_rule(config, token, payload)
            else:
                if afd_code is None or omschrijving is None or expressie is None:
                    self._send_json(
                        {"error": "AfdBrancheCodeId, Omschrijving, and Expressie are required"},
                        status_code=400,
                    )
                    return
                payload = {
                    "AfdBrancheCodeId": afd_code,
                    "Omschrijving": omschrijving,
                    "Expressie": expressie,
                    "ResourceId": resource_id,
                }
                data = create_rule(config, token, payload)

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
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON body"}, status_code=400)
        except Exception as exc:
            self._send_json({"error": str(exc)}, status_code=500)
