FROM python:3.12-alpine
WORKDIR /app
RUN cat > /app/server.py <<'PY'
from http.server import BaseHTTPRequestHandler, HTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/healthz':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'ok\n')
            return
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'chesschat bootstrap\n')

    def log_message(self, format, *args):
        return

HTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
PY
EXPOSE 8080
CMD ["python", "/app/server.py"]
