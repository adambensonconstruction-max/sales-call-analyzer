#!/usr/bin/env python3
"""Simple HTTP server for testing Railway deployment."""
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

PORT = int(os.environ.get('PORT', 5000))

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ['/health', '/api/health', '/']:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {'status': 'healthy', 'version': '1.0.0'}
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        print(f"[HTTP] {format % args}")

if __name__ == '__main__':
    print(f"Starting server on port {PORT}")
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    server.serve_forever()
