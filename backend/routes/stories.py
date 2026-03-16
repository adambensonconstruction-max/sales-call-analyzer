"""Story bank routes."""
import logging

from flask import Blueprint, request, jsonify, g

from middleware.auth import require_auth
from middleware.error_handler import ValidationError, NotFoundError
from providers.supabase import get_supabase_client

stories_bp = Blueprint('stories', __name__)
logger = logging.getLogger(__name__)


@stories_bp.route('', methods=['GET'])
@require_auth
def list_stories():
    """List stories for user.
    
    Query params:
        category: Filter by category
        tags: Filter by tags (comma-separated)
        is_template: Include template stories
        
    Returns:
        List of stories.
    """
    user_id = g.user_id
    
    category = request.args.get('category')
    tags = request.args.get('tags', '').split(',') if request.args.get('tags') else []
    include_templates = request.args.get('is_template', 'false').lower() == 'true'
    
    supabase = get_supabase_client()
    
    # Build query
    query = supabase.table('stories').select('*')
    
    # User's stories OR templates
    if include_templates:
        query = query.or_(f"user_id.eq.{user_id},is_template.eq.true")
    else:
        query = query.eq('user_id', user_id)
    
    if category:
        query = query.eq('category', category)
    
    query = query.order('created_at', desc=True)
    result = query.execute()
    
    stories = result.data
    
    # Filter by tags if specified
    if tags:
        stories = [s for s in stories if any(tag in (s.get('tags') or []) for tag in tags)]
    
    return jsonify({
        'data': stories
    })


@stories_bp.route('', methods=['POST'])
@require_auth
def create_story():
    """Create a new story.
    
    Body:
        title: Story title
        content: Story content
        category: Story category
        tags: List of tags
        source_call_id: Optional call ID this story came from
        
    Returns:
        Created story.
    """
    user_id = g.user_id
    
    data = request.get_json()
    if not data:
        raise ValidationError("No data provided")
    
    required = ['title', 'content']
    for field in required:
        if field not in data:
            raise ValidationError(f"{field} is required")
    
    record = {
        'user_id': user_id,
        'title': data['title'],
        'content': data['content'],
        'category': data.get('category', 'custom'),
        'tags': data.get('tags', []),
        'source_call_id': data.get('source_call_id')
    }
    
    supabase = get_supabase_client()
    result = supabase.table('stories').insert(record).execute()
    
    return jsonify({
        'data': result.data[0],
        'message': 'Story created'
    }), 201


@stories_bp.route('/<story_id>', methods=['GET'])
@require_auth
def get_story(story_id: str):
    """Get a specific story.
    
    Args:
        story_id: The story ID.
        
    Returns:
        Story data.
    """
    user_id = g.user_id
    
    supabase = get_supabase_client()
    result = supabase.table('stories').select('*').eq('id', story_id).or_(f"user_id.eq.{user_id},is_template.eq.true").single().execute()
    
    if not result.data:
        raise NotFoundError(f"Story {story_id} not found")
    
    return jsonify({'data': result.data})


@stories_bp.route('/<story_id>', methods=['PUT'])
@require_auth
def update_story(story_id: str):
    """Update a story.
    
    Args:
        story_id: The story ID.
        
    Body:
        title, content, category, tags, etc.
        
    Returns:
        Updated story.
    """
    user_id = g.user_id
    
    data = request.get_json()
    if not data:
        raise ValidationError("No data provided")
    
    # Build update
    allowed_fields = ['title', 'content', 'category', 'tags', 'effectiveness']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    supabase = get_supabase_client()
    result = supabase.table('stories').update(update_data).eq('id', story_id).eq('user_id', user_id).execute()
    
    if not result.data:
        raise NotFoundError(f"Story {story_id} not found")
    
    return jsonify({'data': result.data[0]})


@stories_bp.route('/<story_id>', methods=['DELETE'])
@require_auth
def delete_story(story_id: str):
    """Delete a story.
    
    Args:
        story_id: The story ID.
        
    Returns:
        Success message.
    """
    user_id = g.user_id
    
    supabase = get_supabase_client()
    result = supabase.table('stories').delete().eq('id', story_id).eq('user_id', user_id).execute()
    
    if not result.data:
        raise NotFoundError(f"Story {story_id} not found")
    
    return jsonify({'message': 'Story deleted successfully'})
