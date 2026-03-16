"""Flask application entry point."""
import logging
from flask import Flask, jsonify
from flask_cors import CORS

from config import config
from middleware.error_handler import register_error_handlers
from middleware.rate_limit import init_rate_limiter
from routes import register_blueprints


def create_app(testing: bool = False) -> Flask:
    """Application factory pattern.
    
    Args:
        testing: If True, create app with test configuration.
        
    Returns:
        Configured Flask application instance.
    """
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = config.SECRET_KEY
    app.config['DEBUG'] = config.DEBUG
    app.config['TESTING'] = testing
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_FILE_SIZE_BYTES
    
    # Validate config (skip in testing mode)
    if not testing:
        config.validate()
    
    # CORS
    CORS(app, origins=config.CORS_ORIGINS, supports_credentials=True)
    
    # Rate limiting
    init_rate_limiter(app)
    
    # Error handlers
    register_error_handlers(app)
    
    # Register all blueprints
    register_blueprints(app)
    
    # Health check endpoint (no auth required)
    @app.route('/health')
    def health_check():
        """Health check endpoint."""
        return jsonify({
            'status': 'healthy',
            'version': '2.0.0',
            'environment': config.ENV
        })
    
    # Request logging
    if not testing:
        logging.basicConfig(
            level=logging.INFO if not config.DEBUG else logging.DEBUG,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    return app


# Create the application instance
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
