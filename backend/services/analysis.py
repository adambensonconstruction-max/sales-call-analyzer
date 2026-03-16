"""Analysis service with OpenAI integration."""
import json
import logging
from typing import Dict, Any, List, Optional
from uuid import UUID

from config import config
from providers.supabase import get_supabase_admin_client
from providers.openai_client import OpenAIProvider
from utils.prompts import build_analysis_prompt
from middleware.error_handler import ExternalServiceError, NotFoundError

logger = logging.getLogger(__name__)


class AnalysisService:
    """Service for analyzing sales calls."""
    
    def __init__(self):
        """Initialize analysis service."""
        self.openai = OpenAIProvider()
        self.supabase = get_supabase_admin_client()
    
    def analyze_call(
        self,
        call_id: str,
        user_id: str,
        force_reanalyze: bool = False
    ) -> Dict[str, Any]:
        """Analyze a call and generate insights.
        
        Args:
            call_id: The call ID.
            user_id: The user ID.
            force_reanalyze: If True, reanalyze even if analysis exists.
            
        Returns:
            Analysis result.
        """
        logger.info(f"Starting analysis for call {call_id}")
        
        # Check if analysis already exists
        if not force_reanalyze:
            existing = self.supabase.table('analyses').select('id').eq('call_id', call_id).execute()
            if existing.data:
                logger.info(f"Analysis already exists for call {call_id}, returning existing")
                return self.get_analysis(call_id, user_id)
        
        # Get call and transcript
        call_result = self.supabase.table('calls').select('*').eq('id', call_id).eq('user_id', user_id).single().execute()
        if not call_result.data:
            raise NotFoundError(f"Call {call_id} not found")
        
        call = call_result.data
        
        # Get transcript segments
        segments_result = self.supabase.table('transcript_segments').select('*').eq('call_id', call_id).order('seq').execute()
        segments = segments_result.data
        
        if not segments:
            raise NotFoundError(f"No transcript found for call {call_id}")
        
        # Build transcript text
        transcript_text = self._build_transcript_text(segments)
        speaker_map = self._build_speaker_map(segments)
        
        # Generate analysis
        try:
            analysis_result = self._generate_analysis(transcript_text, speaker_map)
            
            # Store analysis
            self._store_analysis(call_id, user_id, analysis_result)
            
            # Update call status to completed
            self.supabase.table('calls').update({'status': 'completed'}).eq('id', call_id).execute()
            
            logger.info(f"Completed analysis for call {call_id}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Analysis failed for call {call_id}: {e}")
            self.supabase.table('calls').update({
                'status': 'failed',
                'error_message': str(e)
            }).eq('id', call_id).execute()
            raise
    
    def _build_transcript_text(self, segments: List[Dict[str, Any]]) -> str:
        """Build full transcript text from segments.
        
        Args:
            segments: List of transcript segments.
            
        Returns:
            Formatted transcript text.
        """
        lines = []
        for seg in segments:
            speaker = seg.get('speaker_label', 'Unknown')
            text = seg.get('text', '')
            lines.append(f"{speaker}: {text}")
        
        return '\n'.join(lines)
    
    def _build_speaker_map(self, segments: List[Dict[str, Any]]) -> Dict[str, str]:
        """Build map of speakers to roles.
        
        Args:
            segments: List of transcript segments.
            
        Returns:
            Map of speaker_label to speaker_role.
        """
        speaker_map = {}
        for seg in segments:
            label = seg.get('speaker_label', 'Unknown')
            role = seg.get('speaker_role', 'unknown')
            if label not in speaker_map:
                speaker_map[label] = role
        
        return speaker_map
    
    def _generate_analysis(
        self,
        transcript_text: str,
        speaker_map: Dict[str, str]
    ) -> Dict[str, Any]:
        """Generate AI analysis of transcript.
        
        Args:
            transcript_text: Full transcript text.
            speaker_map: Map of speakers to roles.
            
        Returns:
            Structured analysis result.
        """
        messages = build_analysis_prompt(transcript_text, speaker_map)
        
        response = self.openai.chat_completion(
            messages=messages,
            model=config.OPENAI_ANALYSIS_MODEL,
            temperature=0.3,
            response_format={'type': 'json_object'}
        )
        
        try:
            result = json.loads(response['content'])
            result['model_used'] = response['model']
            result['prompt_tokens'] = response['prompt_tokens']
            result['completion_tokens'] = response['completion_tokens']
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse analysis response: {e}")
            raise ExternalServiceError("Failed to parse AI analysis response")
    
    def _store_analysis(
        self,
        call_id: str,
        user_id: str,
        analysis: Dict[str, Any]
    ) -> None:
        """Store analysis in database.
        
        Args:
            call_id: The call ID.
            user_id: The user ID.
            analysis: Analysis result dict.
        """
        record = {
            'call_id': call_id,
            'user_id': user_id,
            'overall_score': analysis.get('overall_score'),
            'discovery_score': analysis.get('discovery_score'),
            'rapport_score': analysis.get('rapport_score'),
            'objection_score': analysis.get('objection_score'),
            'closing_score': analysis.get('closing_score'),
            'storytelling_score': analysis.get('storytelling_score'),
            'persuasion_score': analysis.get('persuasion_score'),
            'summary': analysis.get('summary'),
            'strengths': analysis.get('strengths', []),
            'improvements': analysis.get('improvements', []),
            'objections_detected': analysis.get('objections_detected', []),
            'discovery_questions': analysis.get('discovery_questions', []),
            'persuasion_techniques': analysis.get('persuasion_techniques', []),
            'stories_used': analysis.get('stories_used', []),
            'subconscious_cues': analysis.get('subconscious_cues', []),
            'pain_points': analysis.get('pain_points', []),
            'talk_ratio': analysis.get('talk_ratio', {}),
            'raw_ai_response': analysis,
            'model_used': analysis.get('model_used'),
            'prompt_tokens': analysis.get('prompt_tokens'),
            'completion_tokens': analysis.get('completion_tokens')
        }
        
        # Check if analysis exists
        existing = self.supabase.table('analyses').select('id').eq('call_id', call_id).execute()
        
        if existing.data:
            # Update existing
            self.supabase.table('analyses').update(record).eq('call_id', call_id).execute()
        else:
            # Insert new
            self.supabase.table('analyses').insert(record).execute()
        
        logger.info(f"Stored analysis for call {call_id}")
    
    def get_analysis(self, call_id: str, user_id: str) -> Dict[str, Any]:
        """Get analysis for a call.
        
        Args:
            call_id: The call ID.
            user_id: The user ID (for authorization).
            
        Returns:
            Analysis data.
        """
        # Verify call ownership
        call_result = self.supabase.table('calls').select('id').eq('id', call_id).eq('user_id', user_id).single().execute()
        if not call_result.data:
            raise NotFoundError(f"Call {call_id} not found")
        
        # Get analysis
        analysis_result = self.supabase.table('analyses').select('*').eq('call_id', call_id).single().execute()
        if not analysis_result.data:
            raise NotFoundError(f"Analysis not found for call {call_id}")
        
        analysis = analysis_result.data
        
        # Ensure JSONB fields are properly typed (Supabase client should handle this, but be safe)
        json_fields = [
            'strengths', 'improvements', 'objections_detected',
            'discovery_questions', 'persuasion_techniques', 'stories_used',
            'subconscious_cues', 'pain_points', 'talk_ratio', 'raw_ai_response'
        ]
        
        for field in json_fields:
            if field in analysis and analysis[field] is None:
                analysis[field] = [] if field != 'talk_ratio' and field != 'raw_ai_response' else {}
        
        return analysis
