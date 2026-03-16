"""Minimal Flask app for testing Railway deployment."""
from flask import Flask, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({'message': 'Hello from Railway!'})

@app.route('/health')
@app.route('/api/health')
def health():
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'env': os.getenv('FLASK_ENV', 'unknown')
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
