"""Serve an index-only fixture plus a complete site under a GitHub Pages prefix."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import mimetypes

site = (Path(__file__).resolve().parent.parent / "dist").resolve()
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path in ("/", "/index.html", "/nested/"):
            target = site / "index.html"
        elif path.startswith("/STUFF/"):
            target = (site / (path[len("/STUFF/"):] or "index.html")).resolve()
            if site not in target.parents:
                self.send_error(404)
                return
        else:
            self.send_error(404)
            return
        if not target.is_file():
            self.send_error(404)
            return
        data = target.read_bytes()
        mime = {".webmanifest": "application/manifest+json", ".js": "application/javascript"}.get(target.suffix)
        mime = mime or mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    def log_message(self, *_args):
        pass
ThreadingHTTPServer(("127.0.0.1", 4180), Handler).serve_forever()
