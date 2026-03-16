"""Practice session routes."""
import logging

from flask import Blueprint, request, jsonify, g

from middleware.auth import require_auth
from middleware.error_handler import ValidationError
from services.practice import PracticeService

practice_bp = Blueprint('practice', __name__)
logger = logging.getLogger(__name__)

# Initialize services
practice_service = PracticeService()


@practice_bp.route('/sessions', methods=['GET'])
@require_auth
def list_sessions():
    """List practice sessions for user.
    
    Query params:
        limit: Number of items per page
        completed: Filter by completion status
        
    Returns:
        List of practice sessions.
    """
    user_id = g.user_id
    
    limit = min(int(request.args.get('limit', 20)), 100)
    completed = request.args.get('completed')
    
    from providers.supabase import get_supabase_client
    supabase = get_supabase_client()
    
    query = supabase.table('practice_sessions').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(limit)
    
    if completed is not None:
        query = query.eq('completed', completed.lower() == 'true')
    
    result = query.execute()
    
    return jsonify({
        'data': result.data,
        'meta': {'limit': limit}
    })


@practice_bp.route('/sessions', methods=['POST'])
@require_auth
def create_session():
    """Create a new practice session.
    
    Body:
        type: Practice type (roleplay, objection_handling, discovery, closing, storytelling)
        difficulty: Difficulty level (beginner, intermediate, advanced)
        scenario: Optional scenario configuration
        
    Returns:
        Created session.
    """
    user_id = g.user_id
    
    data = request.get_json()
    if not data:
        raise ValidationError("No data provided")
    
    practice_type = data.get('type')
    if not practice_type:
        raise ValidationError("Practice type is required")
    
    difficulty = data.get('difficulty', 'intermediate')
    scenario = data.get('scenario')
    
    session = practice_service.create_session(
        user_id=user_id,
        practice_type=practice_type,
        difficulty=difficulty,
        scenario_config=scenario
    )
    
    return jsonify({
        'data': session,
        'message': 'Practice session created'
    }), 201


@practice_bp.route('/sessions/<session_id>', methods=['GET'])
@require_auth
def get_session(session_id: str):
    """Get practice session details.
    
    Args:
        session_id: The session ID.
        
    Returns:
        Session data.
    """
    user_id = g.user_id
    
    session = practice_service.get_session(session_id, user_id)
    return jsonify({'data': session})


@practice_bp.route('/sessions/<session_id>/messages', methods=['POST'])
@require_auth
def send_message(session_id: str):
    """Send message in practice session and get AI response.
    
    Args:
        session_id: The session ID.
        
    Body:
        message: User's message
        
    Returns:
        AI response.
    """
    user_id = g.user_id
    
    data = request.get_json()
    if not data or 'message' not in data:
        raise ValidationError("Message is required")
    
    user_message = data['message']
    
    result = practice_service.generate_response(session_id, user_id, user_message)
    
    return jsonify({
        'data': result
    })


@practice_bp.route('/sessions/<session_id>/feedback', methods=['POST'])
@require_auth
def get_feedback(session_id: str):
    """Get AI feedback on practice session.
    
    Args:
        session_id: The session ID.
        
    Returns:
        Feedback data.
    """
    user_id = g.user_id
    
    feedback = practice_service.get_feedback(session_id, user_id)
    
    return jsonify({
        'data': feedback
    })


@practice_bp.route('/roleplay', methods=['POST'])
@require_auth
def quick_roleplay():
    """Quick single-turn roleplay without creating a session.
    
    Body:
        scenario: Scenario description
        user_message: User's message
        
    Returns:
        AI response.
    """
    user_id = g.user_id
    
    data = request.get_json()
    if not data:
        raise ValidationError("No data provided")
    
    scenario = data.get('scenario', 'General sales conversation')
    user_message = data.get('user_message')
    
    if not user_message:
        raise ValidationError("user_message is required")
    
    # Quick roleplay without session persistence
    from providers.openai_client import OpenAIProvider
    from config import config
    
    openai = OpenAIProvider()
    
    messages = [
        {'role': 'system', 'content': f'You are roleplaying as a potential customer in this scenario: {scenario}. Respond naturally as the customer would.'},
        {'role': 'user', 'content': user_message}
    ]
    
    response = openai.chat_completion(
        messages=messages,
        model=config.OPENAI_COACHING_MODEL,
        temperature=0.7
    )
    
    return jsonify({
        'data': {
            'response': response['content']
        }
    })
