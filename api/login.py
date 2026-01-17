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
        # Preflight is niet nodig bij same-origin, maar dit kan geen kwaad
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Alleen checken of de Basic Auth klopt.
        # GEEN calls naar Kinetic/Dias of andere systemen.
        if not is_authorized(self.headers):
            return send_unauthorized(self)

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))
