"""Transcription service with AssemblyAI integration."""
import logging
import tempfile
import os
from typing import Dict, Any, List, Optional
from uuid import UUID

from config import config
from providers.supabase import get_supabase_admin_client
from providers.assemblyai import AssemblyAIProvider
from providers.openai_client import OpenAIProvider
from middleware.error_handler import ExternalServiceError, NotFoundError

logger = logging.getLogger(__name__)


class TranscriptionService:
    """Service for handling audio transcription."""
    
    def __init__(self):
        """Initialize transcription service."""
        self.assemblyai = AssemblyAIProvider()
        self.openai = OpenAIProvider()
        self.supabase = get_supabase_admin_client()
    
    def transcribe_call(
        self,
        call_id: str,
        user_id: str,
        provider: str = 'assemblyai'
    ) -> Dict[str, Any]:
        """Transcribe a call recording.
        
        Args:
            call_id: The call ID.
            user_id: The user ID.
            provider: Transcription provider ('assemblyai' or 'whisper').
            
        Returns:
            Transcription result with segments.
        """
        logger.info(f"Starting transcription for call {call_id} using {provider}")
        
        # Get call details
        call_result = self.supabase.table('calls').select('*').eq('id', call_id).single().execute()
        if not call_result.data:
            raise NotFoundError(f"Call {call_id} not found")
        
        call = call_result.data
        
        # Update status to transcribing
        self._update_call_status(call_id, 'transcribing')
        
        try:
            if provider == 'assemblyai':
                result = self._transcribe_with_assemblyai(call)
            elif provider == 'whisper':
                result = self._transcribe_with_whisper(call)
            else:
                raise ValueError(f"Unsupported transcription provider: {provider}")
            
            # Store transcript segments
            self._store_transcript_segments(call_id, result['segments'])
            
            # Update call with transcription info
            self._update_call_after_transcription(
                call_id,
                duration_secs=int(result.get('duration', 0)),
                provider=provider
            )
            
            logger.info(f"Completed transcription for call {call_id}")
            return result
            
        except Exception as e:
            logger.error(f"Transcription failed for call {call_id}: {e}")
            self._update_call_status(call_id, 'failed', str(e))
            raise
    
    def _transcribe_with_assemblyai(self, call: Dict[str, Any]) -> Dict[str, Any]:
        """Transcribe using AssemblyAI.
        
        Args:
            call: Call data with file_path.
            
        Returns:
            Transcription result.
        """
        from providers.supabase import SupabaseStorage
        
        storage = SupabaseStorage(admin=True)
        
        # Download audio file
        file_data = storage.download_file(call['file_path'])
        
        # Upload to AssemblyAI
        upload_url = self.assemblyai.upload_file(file_data)
        
        # Start transcription
        transcript_info = self.assemblyai.transcribe_file(
            audio_url=upload_url,
            speaker_labels=True,
            language_code=call.get('language', 'en_us')
        )
        
        # Poll for completion
        result = self.assemblyai.poll_transcript(transcript_info['id'])
        
        return {
            'text': result['text'],
            'duration': result.get('audio_duration', 0),
            'segments': self._convert_assemblyai_segments(result.get('segments', []))
        }
    
    def _transcribe_with_whisper(self, call: Dict[str, Any]) -> Dict[str, Any]:
        """Transcribe using OpenAI Whisper.
        
        Args:
            call: Call data with file_path.
            
        Returns:
            Transcription result.
        """
        from providers.supabase import SupabaseStorage
        
        storage = SupabaseStorage(admin=True)
        
        # Download audio file to temp location
        file_data = storage.download_file(call['file_path'])
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp:
            tmp.write(file_data)
            tmp_path = tmp.name
        
        try:
            result = self.openai.transcribe_audio(
                audio_file_path=tmp_path,
                model=config.OPENAI_WHISPER_MODEL,
                language=call.get('language', 'en')
            )
            
            return {
                'text': result['text'],
                'duration': result.get('duration', 0),
                'segments': result.get('segments', [])
            }
        finally:
            os.unlink(tmp_path)
    
    def _convert_assemblyai_segments(
        self,
        segments: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Convert AssemblyAI segments to our format.
        
        Args:
            segments: AssemblyAI segments.
            
        Returns:
            Standardized segments.
        """
        return [
            {
                'speaker_label': seg.get('speaker', 'A'),
                'text': seg['text'],
                'start_ms': seg['start'],
                'end_ms': seg['end'],
                'confidence': seg.get('confidence', 1.0)
            }
            for seg in segments
        ]
    
    def _store_transcript_segments(
        self,
        call_id: str,
        segments: List[Dict[str, Any]]
    ) -> None:
        """Store transcript segments in database.
        
        Args:
            call_id: The call ID.
            segments: List of segment dicts.
        """
        if not segments:
            logger.warning(f"No segments to store for call {call_id}")
            return
        
        # Prepare segment records
        records = []
        for i, seg in enumerate(segments):
            records.append({
                'call_id': call_id,
                'speaker_label': seg.get('speaker_label', seg.get('speaker', 'A')),
                'text': seg['text'],
                'start_ms': seg['start_ms'] if 'start_ms' in seg else seg.get('start', 0),
                'end_ms': seg['end_ms'] if 'end_ms' in seg else seg.get('end', 0),
                'confidence': seg.get('confidence', 1.0),
                'seq': i
            })
        
        # Insert in batches
        batch_size = 100
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            self.supabase.table('transcript_segments').insert(batch).execute()
        
        logger.info(f"Stored {len(records)} transcript segments for call {call_id}")
    
    def _update_call_status(
        self,
        call_id: str,
        status: str,
        error_message: Optional[str] = None
    ) -> None:
        """Update call status.
        
        Args:
            call_id: The call ID.
            status: New status.
            error_message: Optional error message.
        """
        update_data = {'status': status}
        if error_message:
            update_data['error_message'] = error_message
        
        self.supabase.table('calls').update(update_data).eq('id', call_id).execute()
    
    def _update_call_after_transcription(
        self,
        call_id: str,
        duration_secs: int,
        provider: str
    ) -> None:
        """Update call after transcription completes.
        
        Args:
            call_id: The call ID.
            duration_secs: Audio duration in seconds.
            provider: Transcription provider used.
        """
        self.supabase.table('calls').update({
            'status': 'analyzing',
            'duration_secs': duration_secs,
            'transcription_provider': provider
        }).eq('id', call_id).execute()
    
    def get_transcript(self, call_id: str, user_id: str) -> Dict[str, Any]:
        """Get transcript for a call.
        
        Args:
            call_id: The call ID.
            user_id: The user ID (for authorization).
            
        Returns:
            Transcript data with segments.
        """
        # Verify call ownership
        call_result = self.supabase.table('calls').select('id, status').eq('id', call_id).eq('user_id', user_id).single().execute()
        if not call_result.data:
            raise NotFoundError(f"Call {call_id} not found")
        
        # Get segments
        segments_result = self.supabase.table('transcript_segments').select('*').eq('call_id', call_id).order('seq').execute()
        
        return {
            'call_id': call_id,
            'status': call_result.data['status'],
            'segments': segments_result.data
        }
    
    def update_speaker_roles(
        self,
        call_id: str,
        user_id: str,
        speaker_assignments: Dict[str, str]
    ) -> None:
        """Update speaker roles for a call.
        
        Args:
            call_id: The call ID.
            user_id: The user ID (for authorization).
            speaker_assignments: Map of speaker_label -> speaker_role.
        """
        # Verify call ownership
        call_result = self.supabase.table('calls').select('id').eq('id', call_id).eq('user_id', user_id).single().execute()
        if not call_result.data:
            raise NotFoundError(f"Call {call_id} not found")
        
        # Update each segment
        for speaker_label, speaker_role in speaker_assignments.items():
            self.supabase.table('transcript_segments').update({
                'speaker_role': speaker_role
            }).eq('call_id', call_id).eq('speaker_label', speaker_label).execute()
        
        logger.info(f"Updated speaker roles for call {call_id}")
