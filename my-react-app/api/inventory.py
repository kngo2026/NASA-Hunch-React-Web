from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Example: Get inventory
        inventory = [
            {"id": 1, "name": "Bandages", "quantity": 150},
            {"id": 2, "name": "Antiseptic", "quantity": 75}
        ]
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')  # CORS
        self.end_headers()
        self.wfile.write(json.dumps(inventory).encode())
        return
    
    def do_POST(self):
        # Example: Add/update inventory
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        # Process data here
        response = {"status": "success", "data": data}
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())
        return