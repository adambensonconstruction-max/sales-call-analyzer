"""OpenAI client provider with retry logic."""
import logging
from functools import lru_cache
from typing import Optional, List, Dict, Any

import openai
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import config

logger = logging.getLogger(__name__)

_openai_client: Optional[OpenAI] = None


def get_openai_client() -> OpenAI:
    """Get or create OpenAI client.
    
    Returns:
        Configured OpenAI client.
    """
    global _openai_client
    
    if _openai_client is None:
        if not config.OPENAI_API_KEY:
            raise ValueError("OpenAI API key must be configured")
        
        _openai_client = OpenAI(api_key=config.OPENAI_API_KEY)
        logger.debug("Created new OpenAI client")
    
    return _openai_client


class OpenAIProvider:
    """Provider class for OpenAI API operations."""
    
    def __init__(self):
        """Initialize OpenAI provider."""
        self.client = get_openai_client()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=10),
        retry=retry_if_exception_type((openai.RateLimitError, openai.APITimeoutError)),
        reraise=True
    )
    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: Optional[int] = None,
        response_format: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Create chat completion with retry logic.
        
        Args:
            messages: List of message dicts with 'role' and 'content'.
            model: Model name (defaults to config.OPENAI_ANALYSIS_MODEL).
            temperature: Sampling temperature.
            max_tokens: Maximum tokens to generate.
            response_format: Optional response format (e.g., {"type": "json_object"}).
            
        Returns:
            Response dict with content and usage info.
        """
        model = model or config.OPENAI_ANALYSIS_MODEL
        
        try:
            kwargs = {
                'model': model,
                'messages': messages,
                'temperature': temperature,
            }
            
            if max_tokens:
                kwargs['max_tokens'] = max_tokens
            
            if response_format:
                kwargs['response_format'] = response_format
            
            response = self.client.chat.completions.create(**kwargs)
            
            return {
                'content': response.choices[0].message.content,
                'model': response.model,
                'prompt_tokens': response.usage.prompt_tokens if response.usage else 0,
                'completion_tokens': response.usage.completion_tokens if response.usage else 0,
                'total_tokens': response.usage.total_tokens if response.usage else 0
            }
        except Exception as e:
            logger.error(f"OpenAI chat completion failed: {e}")
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=10),
        retry=retry_if_exception_type((openai.RateLimitError, openai.APITimeoutError)),
        reraise=True
    )
    def transcribe_audio(
        self,
        audio_file_path: str,
        model: str = 'whisper-1',
        language: Optional[str] = None,
        response_format: str = 'verbose_json'
    ) -> Dict[str, Any]:
        """Transcribe audio file using Whisper.
        
        Args:
            audio_file_path: Path to audio file.
            model: Whisper model name.
            language: Optional language code.
            response_format: Response format.
            
        Returns:
            Transcription result with segments.
        """
        try:
            with open(audio_file_path, 'rb') as audio_file:
                kwargs = {
                    'model': model,
                    'file': audio_file,
                    'response_format': response_format,
                    'timestamp_granularities': ['segment']
                }
                
                if language:
                    kwargs['language'] = language
                
                response = self.client.audio.transcriptions.create(**kwargs)
                
                # Parse response based on format
                if response_format == 'verbose_json':
                    return {
                        'text': response.text,
                        'segments': [
                            {
                                'id': seg.id,
                                'start': seg.start,
                                'end': seg.end,
                                'text': seg.text,
                                'speaker': getattr(seg, 'speaker', None)
                            }
                            for seg in (response.segments or [])
                        ],
                        'language': response.language,
                        'duration': response.duration
                    }
                else:
                    return {'text': response.text}
                    
        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
            raise
    
    def create_embedding(
        self,
        text: str,
        model: str = 'text-embedding-3-small'
    ) -> List[float]:
        """Create text embedding.
        
        Args:
            text: Text to embed.
            model: Embedding model.
            
        Returns:
            Embedding vector.
        """
        try:
            response = self.client.embeddings.create(
                model=model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding creation failed: {e}")
            raise
    
    def text_to_speech(
        self,
        text: str,
        voice: str = 'alloy',
        model: str = 'tts-1'
    ) -> bytes:
        """Convert text to speech.
        
        Args:
            text: Text to convert.
            voice: Voice to use.
            model: TTS model.
            
        Returns:
            Audio bytes.
        """
        try:
            response = self.client.audio.speech.create(
                model=model,
                voice=voice,
                input=text
            )
            return response.content
        except Exception as e:
            logger.error(f"Text-to-speech failed: {e}")
            raise
