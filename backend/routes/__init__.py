"""Routes package."""
from flask import Flask

from .auth import auth_bp
from .calls import calls_bp
from .analysis import analysis_bp
from .practice import practice_bp
from .stories import stories_bp
from .dashboard import dashboard_bp


def register_blueprints(app: Flask) -> None:
    """Register all blueprints with the Flask app.
    
    Args:
        app: The Flask application instance.
    """
    from config import config
    
    prefix = config.API_PREFIX
    
    app.register_blueprint(auth_bp, url_prefix=f"{prefix}/auth")
    app.register_blueprint(calls_bp, url_prefix=f"{prefix}/calls")
    app.register_blueprint(analysis_bp, url_prefix=f"{prefix}/analysis")
    app.register_blueprint(practice_bp, url_prefix=f"{prefix}/practice")
    app.register_blueprint(stories_bp, url_prefix=f"{prefix}/stories")
    app.register_blueprint(dashboard_bp, url_prefix=f"{prefix}/dashboard")
