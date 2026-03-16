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
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    logger.info("Creating Flask app...")
    
    app = Flask(__name__)
    logger.info("Flask app created")
    
    # Configuration
    app.config['SECRET_KEY'] = config.SECRET_KEY
    app.config['DEBUG'] = config.DEBUG
    app.config['TESTING'] = testing
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_FILE_SIZE_BYTES
    logger.info("Config loaded")
    
    # Validate config (skip in testing mode)
    if not testing:
        logger.info("Validating config...")
        config.validate()
        logger.info("Config validated")
    
    # CORS
    logger.info("Setting up CORS...")
    CORS(app, origins=config.CORS_ORIGINS, supports_credentials=True)
    logger.info("CORS setup complete")
    
    # Rate limiting
    logger.info("Setting up rate limiter...")
    init_rate_limiter(app)
    logger.info("Rate limiter setup complete")
    
    # Error handlers
    logger.info("Registering error handlers...")
    register_error_handlers(app)
    logger.info("Error handlers registered")
    
    # Register all blueprints
    logger.info("Registering blueprints...")
    # Temporarily skip blueprints for testing
    # register_blueprints(app)
    logger.info("Blueprints registration skipped for testing")
    
    # Health check endpoints (no auth required)
    @app.route('/health')
    @app.route('/api/health')
    def health_check():
        """Health check endpoint."""
        return jsonify({
            'status': 'healthy',
            'version': '2.0.0',
            'environment': config.ENV
        })
    logger.info("Health endpoints registered")
    logger.info("App creation complete!")
    
    return app
    
    # Request logging
    if not testing:
        logging.basicConfig(
            level=logging.INFO if not config.DEBUG else logging.DEBUG,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    return app


# Create the application instance with error handling
try:
    app = create_app()
except Exception as e:
    import logging
    logging.basicConfig(level=logging.ERROR)
    logger = logging.getLogger(__name__)
    logger.error(f"Failed to create app: {e}")
    import traceback
    logger.error(traceback.format_exc())
    raise

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
