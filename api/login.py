from http.server import BaseHTTPRequestHandler
import json
import os
import sys

current_dir = os.path.dirname(__file__)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from _auth import is_authorized, send_unauthorized


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Handig voor CORS/Preflight (ook al zit alles meestal op dezelfde domain)
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.end_headers()

    def do_GET(self):
        # Alleen checken of de Basic Auth klopt.
        # GEEN calls naar Kinetic/Dias of andere systemen.
        if not is_authorized(self.headers):
            return send_unauthorized(self)

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))
