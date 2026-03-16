"""Authentication middleware with JWT validation."""
import functools
import logging
from typing import Optional, Callable, Any

import jwt
from flask import request, g, jsonify

from config import config
from providers.supabase import get_supabase_client

logger = logging.getLogger(__name__)


def extract_bearer_token(auth_header: Optional[str]) -> Optional[str]:
    """Extract Bearer token from Authorization header.
    
    Args:
        auth_header: The Authorization header value.
        
    Returns:
        The JWT token if present, None otherwise.
    """
    if not auth_header:
        return None
    
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    
    return parts[1]


def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload.
    
    Args:
        token: The JWT token to verify.
        
    Returns:
        Decoded token payload if valid, None otherwise.
    """
    try:
        # Decode without verification first to get the algorithm
        unverified = jwt.decode(token, options={"verify_signature": False})
        
        # Verify with Supabase JWT secret
        # Note: In production, you should fetch the JWKS from Supabase
        payload = jwt.decode(
            token,
            config.SUPABASE_JWT_SECRET,
            algorithms=['HS256'],
            audience='authenticated',
            options={"verify_exp": True}
        )
        
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return None


def require_auth(f: Callable) -> Callable:
    """Decorator to require authentication on a route.
    
    Usage:
        @app.route('/protected')
        @require_auth
        def protected_route():
            user_id = g.user_id
            ...
    """
    @functools.wraps(f)
    def decorated(*args: Any, **kwargs: Any) -> Any:
        auth_header = request.headers.get('Authorization')
        token = extract_bearer_token(auth_header)
        
        if not token:
            return jsonify({
                'error': {
                    'code': 'UNAUTHORIZED',
                    'message': 'Missing or invalid authorization header'
                }
            }), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({
                'error': {
                    'code': 'UNAUTHORIZED',
                    'message': 'Invalid or expired token'
                }
            }), 401
        
        # Store user info in Flask's g object
        g.user_id = payload.get('sub')
        g.user_email = payload.get('email')
        g.user_role = payload.get('role', 'user')
        g.token = token
        
        # Verify user exists in database
        try:
            supabase = get_supabase_client()
            result = supabase.table('profiles').select('id, role').eq('id', g.user_id).execute()
            if not result.data:
                return jsonify({
                    'error': {
                        'code': 'UNAUTHORIZED',
                        'message': 'User not found'
                    }
                }), 401
            
            # Update role from database
            g.user_role = result.data[0].get('role', 'user')
        except Exception as e:
            logger.error(f"Error verifying user: {e}")
            return jsonify({
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'Error verifying user'
                }
            }), 500
        
        return f(*args, **kwargs)
    
    return decorated


def require_role(*roles: str) -> Callable:
    """Decorator to require specific role(s) for a route.
    
    Usage:
        @app.route('/admin')
        @require_role('admin', 'manager')
        def admin_route():
            ...
    """
    def decorator(f: Callable) -> Callable:
        @functools.wraps(f)
        @require_auth
        def decorated(*args: Any, **kwargs: Any) -> Any:
            if g.user_role not in roles:
                return jsonify({
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': f'Required role: {", ".join(roles)}'
                    }
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
