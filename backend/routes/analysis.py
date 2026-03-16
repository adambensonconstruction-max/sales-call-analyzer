"""Analysis routes."""
import logging

from flask import Blueprint, request, jsonify, g

from middleware.auth import require_auth
from middleware.error_handler import ValidationError
from services.analysis import AnalysisService

analysis_bp = Blueprint('analysis', __name__)
logger = logging.getLogger(__name__)

# Initialize services
analysis_service = AnalysisService()


@analysis_bp.route('/calls/<call_id>', methods=['GET'])
@require_auth
def get_analysis(call_id: str):
    """Get analysis for a call.
    
    Args:
        call_id: The call ID.
        
    Returns:
        Analysis data.
    """
    user_id = g.user_id
    
    analysis = analysis_service.get_analysis(call_id, user_id)
    return jsonify({'data': analysis})


@analysis_bp.route('/calls/<call_id>', methods=['POST'])
@require_auth
def create_analysis(call_id: str):
    """Create or re-trigger analysis for a call.
    
    Args:
        call_id: The call ID.
        
    Query params:
        force: If true, reanalyze even if analysis exists
        
    Returns:
        Analysis result.
    """
    user_id = g.user_id
    force = request.args.get('force', 'false').lower() == 'true'
    
    result = analysis_service.analyze_call(call_id, user_id, force_reanalyze=force)
    return jsonify({'data': result})


@analysis_bp.route('/calls/<call_id>/scores', methods=['GET'])
@require_auth
def get_scores(call_id: str):
    """Get just the scores for a call.
    
    Args:
        call_id: The call ID.
        
    Returns:
        Score breakdown.
    """
    user_id = g.user_id
    
    analysis = analysis_service.get_analysis(call_id, user_id)
    
    scores = {
        'overall_score': analysis.get('overall_score'),
        'discovery_score': analysis.get('discovery_score'),
        'rapport_score': analysis.get('rapport_score'),
        'objection_score': analysis.get('objection_score'),
        'closing_score': analysis.get('closing_score'),
        'storytelling_score': analysis.get('storytelling_score'),
        'persuasion_score': analysis.get('persuasion_score')
    }
    
    return jsonify({'data': scores})


@analysis_bp.route('/calls/<call_id>/summary', methods=['GET'])
@require_auth
def get_summary(call_id: str):
    """Get just the summary for a call.
    
    Args:
        call_id: The call ID.
        
    Returns:
        Summary text.
    """
    user_id = g.user_id
    
    analysis = analysis_service.get_analysis(call_id, user_id)
    
    return jsonify({
        'data': {
            'summary': analysis.get('summary'),
            'talk_ratio': analysis.get('talk_ratio')
        }
    })


@analysis_bp.route('/calls/<call_id>/strengths', methods=['GET'])
@require_auth
def get_strengths(call_id: str):
    """Get strengths identified in a call.
    
    Args:
        call_id: The call ID.
        
    Returns:
        List of strengths.
    """
    user_id = g.user_id
    
    analysis = analysis_service.get_analysis(call_id, user_id)
    
    return jsonify({
        'data': analysis.get('strengths', [])
    })


@analysis_bp.route('/calls/<call_id>/improvements', methods=['GET'])
@require_auth
def get_improvements(call_id: str):
    """Get improvement areas identified in a call.
    
    Args:
        call_id: The call ID.
        
    Returns:
        List of improvements.
    """
    user_id = g.user_id
    
    analysis = analysis_service.get_analysis(call_id, user_id)
    
    return jsonify({
        'data': analysis.get('improvements', [])
    })
