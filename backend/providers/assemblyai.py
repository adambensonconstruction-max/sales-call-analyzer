"""AssemblyAI client provider."""
import logging
import time
from typing import Optional, List, Dict, Any

import assemblyai as aai

from config import config

logger = logging.getLogger(__name__)

_aai_client: Optional[aai.Transcriber] = None


def get_assemblyai_client() -> aai.Transcriber:
    """Get or create AssemblyAI client.
    
    Returns:
        Configured AssemblyAI transcriber.
    """
    global _aai_client
    
    if _aai_client is None:
        if not config.ASSEMBLYAI_API_KEY:
            raise ValueError("AssemblyAI API key must be configured")
        
        aai.settings.api_key = config.ASSEMBLYAI_API_KEY
        _aai_client = aai.Transcriber()
        logger.debug("Created new AssemblyAI client")
    
    return _aai_client


class AssemblyAIProvider:
    """Provider class for AssemblyAI operations."""
    
    def __init__(self):
        """Initialize AssemblyAI provider."""
        self.client = get_assemblyai_client()
    
    def transcribe_file(
        self,
        audio_url: str,
        speaker_labels: bool = True,
        language_code: str = 'en_us',
        webhook_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Submit audio file for transcription.
        
        Args:
            audio_url: URL to audio file (public URL or AssemblyAI upload).
            speaker_labels: Enable speaker diarization.
            language_code: Language code.
            webhook_url: Optional webhook URL for completion notification.
            
        Returns:
            Transcript object with ID and status.
        """
        try:
            config_aai = aai.TranscriptionConfig(
                speaker_labels=speaker_labels,
                language_code=language_code,
                webhook_url=webhook_url
            )
            
            transcript = self.client.transcribe_async(
                audio_url,
                config=config_aai
            )
            
            return {
                'id': transcript.id,
                'status': transcript.status.value,
                'audio_url': audio_url
            }
        except Exception as e:
            logger.error(f"AssemblyAI transcription submission failed: {e}")
            raise
    
    def get_transcript(self, transcript_id: str) -> Dict[str, Any]:
        """Get transcript by ID.
        
        Args:
            transcript_id: The transcript ID.
            
        Returns:
            Transcript data with text and segments.
        """
        try:
            transcript = self.client.get_transcript(transcript_id)
            
            result = {
                'id': transcript.id,
                'status': transcript.status.value,
                'text': transcript.text,
                'audio_duration': transcript.audio_duration,
                'language_code': transcript.language_code,
                'segments': []
            }
            
            # Extract utterances if speaker labels enabled
            if transcript.utterances:
                result['segments'] = [
                    {
                        'speaker': utterance.speaker,
                        'text': utterance.text,
                        'start': utterance.start,
                        'end': utterance.end,
                        'confidence': utterance.confidence
                    }
                    for utterance in transcript.utterances
                ]
            elif transcript.words:
                # Group words into segments if no utterances
                result['segments'] = [
                    {
                        'speaker': word.speaker if hasattr(word, 'speaker') else 'A',
                        'text': word.text,
                        'start': word.start,
                        'end': word.end,
                        'confidence': word.confidence
                    }
                    for word in transcript.words
                ]
            
            return result
        except Exception as e:
            logger.error(f"Failed to get AssemblyAI transcript: {e}")
            raise
    
    def poll_transcript(
        self,
        transcript_id: str,
        max_attempts: int = 60,
        poll_interval: int = 5
    ) -> Dict[str, Any]:
        """Poll for transcript completion.
        
        Args:
            transcript_id: The transcript ID.
            max_attempts: Maximum polling attempts.
            poll_interval: Seconds between polls.
            
        Returns:
            Completed transcript data.
            
        Raises:
            TimeoutError: If transcription doesn't complete in time.
        """
        for attempt in range(max_attempts):
            transcript = self.get_transcript(transcript_id)
            status = transcript['status']
            
            if status == 'completed':
                return transcript
            elif status == 'error':
                raise Exception(f"Transcription failed: {transcript.get('error', 'Unknown error')}")
            
            logger.debug(f"Transcription {transcript_id} status: {status}, waiting...")
            time.sleep(poll_interval)
        
        raise TimeoutError(f"Transcription did not complete within {max_attempts * poll_interval} seconds")
    
    def upload_file(self, file_data: bytes) -> str:
        """Upload audio file to AssemblyAI.
        
        Args:
            file_data: Audio file bytes.
            
        Returns:
            Upload URL.
        """
        try:
            upload_url = self.client.upload_file(file_data)
            return upload_url
        except Exception as e:
            logger.error(f"AssemblyAI file upload failed: {e}")
            raise
