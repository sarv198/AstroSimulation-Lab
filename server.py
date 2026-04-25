"""
Serves the Astro Simulation Lab dashboard and keeps the pygame slingshot app running.

Usage (from repo root):
  python server.py

- http://127.0.0.1:8080/ serves files from public/ (same layout Vercel uses for static sites).
- The desktop slingshot simulation (slingshot/main.py) is started in a subprocess and
  restarted if it exits, so it stays available alongside the web UI.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import threading
import time
import urllib.parse
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PUBLIC_ROOT = ROOT / "public"
SLINGSHOT_DIR = ROOT / "slingshot"


def supervise_slingshot() -> None:
    """Run slingshot/main.py in a loop so it is always available when the server is up."""
    exe = sys.executable
    entry = SLINGSHOT_DIR / "slingshot.py"
    if not entry.is_file():
        entry = SLINGSHOT_DIR / "main.py"
    if not entry.is_file():
        return
    while True:
        try:
            proc = subprocess.Popen(
                [exe, str(entry)],
                cwd=str(SLINGSHOT_DIR),
                env={**os.environ, "PYTHONUTF8": "1"},
            )
            proc.wait()
        except OSError:
            time.sleep(2.0)
            continue
        time.sleep(0.5)


class LabHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_ROOT), **kwargs)

    def log_message(self, format: str, *args) -> None:
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path == "/" or path == "/index.html":
            self._send_path(PUBLIC_ROOT / "index.html")
            return

        super().do_GET()

    def _send_path(self, fpath: Path) -> None:
        try:
            data = fpath.read_bytes()
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        ctype = self.guess_type(str(fpath))
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--no-pygame", action="store_true", help="Do not launch slingshot/main.py")
    args = parser.parse_args()

    if not PUBLIC_ROOT.is_dir():
        print("Missing public/ folder.", file=sys.stderr)
        sys.exit(1)

    if not args.no_pygame:
        threading.Thread(target=supervise_slingshot, name="slingshot-supervisor", daemon=True).start()

    server = ThreadingHTTPServer((args.host, args.port), LabHTTPRequestHandler)
    print(f"Astro Simulation Lab dashboard: http://{args.host}:{args.port}/")
    if not args.no_pygame:
        print("Pygame slingshot (slingshot/main.py) is supervised in the background.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()


if __name__ == "__main__":
    main()
