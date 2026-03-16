"""Global error handling middleware."""
import logging
from flask import Flask, jsonify

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base application error."""
    
    status_code = 500
    code = "INTERNAL_ERROR"
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class NotFoundError(AppError):
    """Resource not found error."""
    
    status_code = 404
    code = "NOT_FOUND"


class ValidationError(AppError):
    """Validation error."""
    
    status_code = 422
    code = "VALIDATION_ERROR"


class AuthenticationError(AppError):
    """Authentication error."""
    
    status_code = 401
    code = "UNAUTHORIZED"


class ForbiddenError(AppError):
    """Forbidden error."""
    
    status_code = 403
    code = "FORBIDDEN"


class ExternalServiceError(AppError):
    """External service error."""
    
    status_code = 502
    code = "EXTERNAL_SERVICE_ERROR"


class RateLimitError(AppError):
    """Rate limit exceeded error."""
    
    status_code = 429
    code = "RATE_LIMIT_EXCEEDED"


class ConflictError(AppError):
    """Resource conflict error."""
    
    status_code = 409
    code = "CONFLICT"


def register_error_handlers(app: Flask) -> None:
    """Register error handlers with the Flask app.
    
    Args:
        app: The Flask application instance.
    """
    
    @app.errorhandler(AppError)
    def handle_app_error(error: AppError):
        """Handle application-specific errors."""
        response = {
            'error': {
                'code': error.code,
                'message': error.message,
                'details': error.details
            }
        }
        return jsonify(response), error.status_code
    
    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 errors."""
        return jsonify({
            'error': {
                'code': 'NOT_FOUND',
                'message': 'The requested resource was not found'
            }
        }), 404
    
    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        """Handle 405 errors."""
        return jsonify({
            'error': {
                'code': 'METHOD_NOT_ALLOWED',
                'message': 'The requested method is not allowed for this resource'
            }
        }), 405
    
    @app.errorhandler(413)
    def handle_payload_too_large(error):
        """Handle 413 errors."""
        return jsonify({
            'error': {
                'code': 'PAYLOAD_TOO_LARGE',
                'message': 'The request payload is too large'
            }
        }), 413
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Handle unexpected errors."""
        logger.exception("Unexpected error occurred")
        
        # In production, don't expose internal error details
        from config import config
        if config.ENV == 'production':
            return jsonify({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'An unexpected error occurred'
                }
            }), 500
        else:
            return jsonify({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': str(error),
                    'type': type(error).__name__
                }
            }), 500
