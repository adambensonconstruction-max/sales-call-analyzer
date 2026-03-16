"""Call management routes."""
import logging
from uuid import UUID

from flask import Blueprint, request, jsonify, g

from middleware.auth import require_auth
from middleware.rate_limit import get_limiter
from middleware.error_handler import ValidationError, NotFoundError
from services.storage import StorageService
from services.transcription import TranscriptionService
from providers.supabase import get_supabase_client
from config import config
from utils.validators import validate_audio_file

calls_bp = Blueprint('calls', __name__)
logger = logging.getLogger(__name__)

# Initialize services
storage_service = StorageService()
transcription_service = TranscriptionService()


@calls_bp.route('', methods=['GET'])
@require_auth
def list_calls():
    """List user's calls with pagination.
    
    Query params:
        cursor: Pagination cursor
        limit: Number of items per page (default 20, max 100)
        status: Filter by status
        
    Returns:
        Paginated list of calls.
    """
    user_id = g.user_id
    
    # Parse query params
    cursor = request.args.get('cursor')
    limit = min(int(request.args.get('limit', 20)), 100)
    status = request.args.get('status')
    
    # Build query
    supabase = get_supabase_client()
    query = supabase.table('calls').select('*').eq('user_id', user_id)
    
    if status:
        query = query.eq('status', status)
    
    # Order by created_at desc
    query = query.order('created_at', desc=True).limit(limit)
    
    if cursor:
        query = query.lt('id', cursor)
    
    result = query.execute()
    
    # Build response
    calls = result.data
    next_cursor = calls[-1]['id'] if len(calls) == limit else None
    
    return jsonify({
        'data': calls,
        'meta': {
            'next_cursor': next_cursor,
            'has_more': len(calls) == limit,
            'limit': limit
        }
    })


@calls_bp.route('/<call_id>', methods=['GET'])
@require_auth
def get_call(call_id: str):
    """Get a specific call with transcript and analysis.
    
    Args:
        call_id: The call ID.
        
    Returns:
        Call data with transcript segments.
    """
    user_id = g.user_id
    
    # Get call
    supabase = get_supabase_client()
    call_result = supabase.table('calls').select('*').eq('id', call_id).eq('user_id', user_id).single().execute()
    
    if not call_result.data:
        raise NotFoundError(f"Call {call_id} not found")
    
    call = call_result.data
    
    # Get transcript segments if available
    if call['status'] in ['analyzing', 'completed']:
        segments_result = supabase.table('transcript_segments').select('*').eq('call_id', call_id).order('seq').execute()
        call['transcript_segments'] = segments_result.data
    else:
        call['transcript_segments'] = []
    
    return jsonify({'data': call})


@calls_bp.route('', methods=['POST'])
@require_auth
# @get_limiter().limit(config.RATE_LIMIT_UPLOAD)  # Applied at app level
def upload_call():
    """Upload a new call recording.
    
    Form data:
        file: Audio file
        name: Optional display name
        language: Language code (default 'en')
        
    Returns:
        Created call with ID and status.
    """
    user_id = g.user_id
    
    # Check for file
    if 'file' not in request.files:
        raise ValidationError("No file provided")
    
    file = request.files['file']
    if file.filename == '':
        raise ValidationError("No file selected")
    
    # Validate file
    file_data = file.read()
    validate_audio_file(file_data, file.content_type)
    
    # Get form data
    name = request.form.get('name') or file.filename
    language = request.form.get('language', 'en')
    
    try:
        # Upload to storage
        upload_result = storage_service.upload_call_recording(
            user_id=user_id,
            file_data=file_data,
            original_filename=file.filename,
            content_type=file.content_type or 'audio/mpeg'
        )
        
        # Create call record
        supabase = get_supabase_client()
        call_result = supabase.table('calls').insert({
            'user_id': user_id,
            'name': name,
            'status': 'uploading',
            'file_path': upload_result['path'],
            'file_size_bytes': len(file_data),
            'file_mime_type': file.content_type,
            'language': language
        }).execute()
        
        call = call_result.data[0]
        
        # Start transcription in background (for now, synchronous)
        # In production, use a task queue like Celery
        try:
            transcription_service.transcribe_call(
                call_id=call['id'],
                user_id=user_id,
                provider='assemblyai'
            )
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            # Call record already exists, will be in failed state
        
        return jsonify({
            'data': call,
            'message': 'Call uploaded successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise


@calls_bp.route('/<call_id>', methods=['PATCH'])
@require_auth
def update_call(call_id: str):
    """Update call metadata.
    
    Args:
        call_id: The call ID.
        
    Body:
        name: New display name
        
    Returns:
        Updated call.
    """
    user_id = g.user_id
    
    data = request.get_json()
    if not data:
        raise ValidationError("No data provided")
    
    # Build update
    update_data = {}
    if 'name' in data:
        update_data['name'] = data['name']
    
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    # Update
    supabase = get_supabase_client()
    result = supabase.table('calls').update(update_data).eq('id', call_id).eq('user_id', user_id).execute()
    
    if not result.data:
        raise NotFoundError(f"Call {call_id} not found")
    
    return jsonify({'data': result.data[0]})


@calls_bp.route('/<call_id>', methods=['DELETE'])
@require_auth
def delete_call(call_id: str):
    """Delete a call and associated data.
    
    Args:
        call_id: The call ID.
        
    Returns:
        Success message.
    """
    user_id = g.user_id
    
    # Get call to find file path
    supabase = get_supabase_client()
    call_result = supabase.table('calls').select('file_path').eq('id', call_id).eq('user_id', user_id).single().execute()
    
    if not call_result.data:
        raise NotFoundError(f"Call {call_id} not found")
    
    file_path = call_result.data['file_path']
    
    # Delete from storage
    if file_path:
        try:
            storage_service.delete_call_recording(file_path)
        except Exception as e:
            logger.warning(f"Failed to delete file from storage: {e}")
    
    # Delete from database (cascades to segments and analysis)
    supabase.table('calls').delete().eq('id', call_id).eq('user_id', user_id).execute()
    
    return jsonify({
        'message': 'Call deleted successfully'
    })


@calls_bp.route('/<call_id>/transcript', methods=['GET'])
@require_auth
def get_transcript(call_id: str):
    """Get transcript for a call.
    
    Args:
        call_id: The call ID.
        
    Returns:
        Transcript data with segments.
    """
    user_id = g.user_id
    
    transcript = transcription_service.get_transcript(call_id, user_id)
    return jsonify({'data': transcript})


@calls_bp.route('/<call_id>/speakers', methods=['POST'])
@require_auth
def assign_speakers(call_id: str):
    """Assign speaker roles for a call.
    
    Args:
        call_id: The call ID.
        
    Body:
        assignments: Dict mapping speaker_label to speaker_role
        
    Returns:
        Success message.
    """
    user_id = g.user_id
    
    data = request.get_json()
    if not data or 'assignments' not in data:
        raise ValidationError("No assignments provided")
    
    assignments = data['assignments']
    
    transcription_service.update_speaker_roles(call_id, user_id, assignments)
    
    return jsonify({
        'message': 'Speaker roles updated successfully'
    })


@calls_bp.route('/<call_id>/transcribe', methods=['POST'])
@require_auth
def retranscribe_call(call_id: str):
    """Re-trigger transcription for a call.
    
    Args:
        call_id: The call ID.
        
    Query params:
        provider: Transcription provider (assemblyai or whisper)
        
    Returns:
        Status message.
    """
    user_id = g.user_id
    provider = request.args.get('provider', 'assemblyai')
    
    # Delete existing segments
    supabase = get_supabase_client()
    supabase.table('transcript_segments').delete().eq('call_id', call_id).execute()
    
    # Re-transcribe
    transcription_service.transcribe_call(call_id, user_id, provider)
    
    return jsonify({
        'message': 'Transcription started',
        'call_id': call_id
    })
