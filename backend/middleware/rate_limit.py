"""Rate limiting middleware."""
from flask import Flask
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import config

limiter: Limiter = None


def init_rate_limiter(app: Flask) -> Limiter:
    """Initialize rate limiter with Flask app.
    
    Args:
        app: The Flask application instance.
        
    Returns:
        Configured Limiter instance.
    """
    global limiter
    
    if not config.RATE_LIMIT_ENABLED:
        # Create a no-op limiter for testing
        limiter = Limiter(
            app=app,
            key_func=get_remote_address,
            enabled=False
        )
        return limiter
    
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=[config.RATE_LIMIT_DEFAULT],
        storage_uri="memory://"  # Use Redis in production: redis://localhost:6379
    )
    
    return limiter


def get_limiter() -> Limiter:
    """Get the global limiter instance.
    
    Returns:
        The Limiter instance.
    """
    return limiter
