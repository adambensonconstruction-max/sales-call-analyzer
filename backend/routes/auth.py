"""Authentication routes."""
from flask import Blueprint, jsonify, request

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current authenticated user.
    
    Returns:
        User profile data.
    """
    # This is handled by the frontend with Supabase
    # The backend just validates the JWT
    return jsonify({
        'message': 'Use Supabase client for authentication'
    })


@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh authentication token.
    
    Returns:
        New token data.
    """
    return jsonify({
        'message': 'Use Supabase client for token refresh'
    })
