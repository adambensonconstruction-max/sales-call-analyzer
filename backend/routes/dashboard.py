"""Dashboard routes."""
import logging

from flask import Blueprint, request, jsonify, g

from middleware.auth import require_auth, require_role
from providers.supabase import get_supabase_client

dashboard_bp = Blueprint('dashboard', __name__)
logger = logging.getLogger(__name__)


@dashboard_bp.route('', methods=['GET'])
@require_auth
def get_dashboard():
    """Get user dashboard stats.
    
    Returns:
        Dashboard statistics.
    """
    user_id = g.user_id
    
    supabase = get_supabase_client()
    
    # Use the database function for stats
    result = supabase.rpc('get_dashboard_stats', {'target_user_id': user_id}).execute()
    
    return jsonify({
        'data': result.data
    })


@dashboard_bp.route('/trends', methods=['GET'])
@require_auth
def get_trends():
    """Get performance trends over time.
    
    Query params:
        weeks: Number of weeks to look back (default 12)
        
    Returns:
        Trend data.
    """
    user_id = g.user_id
    weeks = int(request.args.get('weeks', 12))
    
    supabase = get_supabase_client()
    
    # Get weekly averages
    result = supabase.table('analyses').select(
        'created_at, overall_score, discovery_score, rapport_score, objection_score, closing_score'
    ).eq('user_id', user_id).gte(
        'created_at', f'now() - interval \'{weeks} weeks\''
    ).order('created_at').execute()
    
    analyses = result.data
    
    # Group by week
    from collections import defaultdict
    import datetime
    
    weekly_data = defaultdict(lambda: {'scores': [], 'count': 0})
    
    for analysis in analyses:
        date = datetime.datetime.fromisoformat(analysis['created_at'].replace('Z', '+00:00'))
        week_key = date.strftime('%Y-W%W')
        
        weekly_data[week_key]['scores'].append(analysis.get('overall_score', 0))
        weekly_data[week_key]['count'] += 1
    
    # Calculate averages
    trends = []
    for week, data in sorted(weekly_data.items()):
        if data['scores']:
            avg_score = sum(data['scores']) / len(data['scores'])
            trends.append({
                'week': week,
                'average_score': round(avg_score, 1),
                'call_count': data['count']
            })
    
    return jsonify({
        'data': trends
    })


@dashboard_bp.route('/category-averages', methods=['GET'])
@require_auth
def get_category_averages():
    """Get average scores by category.
    
    Returns:
        Category averages.
    """
    user_id = g.user_id
    
    supabase = get_supabase_client()
    
    result = supabase.table('analyses').select(
        'discovery_score, rapport_score, objection_score, closing_score, storytelling_score, persuasion_score'
    ).eq('user_id', user_id).execute()
    
    analyses = result.data
    
    if not analyses:
        return jsonify({
            'data': {
                'discovery': None,
                'rapport': None,
                'objection': None,
                'closing': None,
                'storytelling': None,
                'persuasion': None
            }
        })
    
    # Calculate averages
    categories = ['discovery_score', 'rapport_score', 'objection_score', 
                  'closing_score', 'storytelling_score', 'persuasion_score']
    
    averages = {}
    for cat in categories:
        scores = [a[cat] for a in analyses if a.get(cat) is not None]
        averages[cat.replace('_score', '')] = round(sum(scores) / len(scores), 1) if scores else None
    
    return jsonify({
        'data': averages
    })


@dashboard_bp.route('/recent-activity', methods=['GET'])
@require_auth
def get_recent_activity():
    """Get recent activity for dashboard.
    
    Query params:
        limit: Number of items (default 10)
        
    Returns:
        Recent calls and practice sessions.
    """
    user_id = g.user_id
    limit = min(int(request.args.get('limit', 10)), 50)
    
    supabase = get_supabase_client()
    
    # Get recent calls
    calls_result = supabase.table('calls').select(
        'id, name, status, created_at, duration_secs'
    ).eq('user_id', user_id).order('created_at', desc=True).limit(limit).execute()
    
    # Get recent practice sessions
    practice_result = supabase.table('practice_sessions').select(
        'id, type, completed, created_at, score'
    ).eq('user_id', user_id).order('created_at', desc=True).limit(limit).execute()
    
    # Combine and sort
    activities = []
    
    for call in calls_result.data:
        activities.append({
            'type': 'call',
            'id': call['id'],
            'title': call.get('name', 'Untitled Call'),
            'status': call['status'],
            'created_at': call['created_at'],
            'duration_secs': call.get('duration_secs')
        })
    
    for session in practice_result.data:
        activities.append({
            'type': 'practice',
            'id': session['id'],
            'practice_type': session['type'],
            'completed': session['completed'],
            'created_at': session['created_at'],
            'score': session.get('score')
        })
    
    # Sort by created_at desc
    activities.sort(key=lambda x: x['created_at'], reverse=True)
    
    return jsonify({
        'data': activities[:limit]
    })


@dashboard_bp.route('/team', methods=['GET'])
@require_auth
@require_role('manager', 'admin')
def get_team_dashboard():
    """Get team dashboard (managers only).
    
    Returns:
        Team statistics.
    """
    user_id = g.user_id
    
    supabase = get_supabase_client()
    
    # Get user's team
    profile_result = supabase.table('profiles').select('team_id').eq('id', user_id).single().execute()
    
    if not profile_result.data or not profile_result.data.get('team_id'):
        return jsonify({
            'data': {
                'team_members': [],
                'message': 'No team assigned'
            }
        })
    
    team_id = profile_result.data['team_id']
    
    # Get team members
    members_result = supabase.table('profiles').select('id, email, full_name, role').eq('team_id', team_id).execute()
    members = members_result.data
    
    # Get stats for each member
    member_stats = []
    for member in members:
        stats_result = supabase.rpc('get_dashboard_stats', {'target_user_id': member['id']}).execute()
        member_stats.append({
            'user': member,
            'stats': stats_result.data
        })
    
    return jsonify({
        'data': {
            'team_id': team_id,
            'members': member_stats
        }
    })
