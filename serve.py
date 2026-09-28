#!/usr/bin/env python3
"""
Simple HTTP server for testing the railway station explorer.
Run with: python -m http.server 8000
"""

if __name__ == "__main__":
    import http.server
    import socketserver
    import os

    os.chdir(os.path.dirname(os.path.abspath(__file__)) or ".")

    PORT = 8000
    Handler = http.server.SimpleHTTPRequestHandler

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"✅ Server running at http://localhost:{PORT}")
        print(f"📍 Open http://localhost:{PORT}/railway-station-explorer.html")
        print(f"🛑 Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n⏹️  Server stopped")
