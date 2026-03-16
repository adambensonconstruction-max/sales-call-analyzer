"""Centralized configuration for Sales Call Analyzer backend."""
import os
from dataclasses import dataclass, field
from typing import Set, List


@dataclass
class Config:
    """Application configuration from environment variables."""
    
    # Flask
    SECRET_KEY: str = field(default_factory=lambda: os.getenv('FLASK_SECRET_KEY', 'change-me-in-production'))
    ENV: str = field(default_factory=lambda: os.getenv('FLASK_ENV', 'production'))
    DEBUG: bool = field(default_factory=lambda: os.getenv('FLASK_ENV', 'production') == 'development')
    
    # Supabase
    SUPABASE_URL: str = field(default_factory=lambda: os.getenv('SUPABASE_URL', ''))
    SUPABASE_ANON_KEY: str = field(default_factory=lambda: os.getenv('SUPABASE_ANON_KEY', ''))
    SUPABASE_SERVICE_ROLE_KEY: str = field(default_factory=lambda: os.getenv('SUPABASE_SERVICE_ROLE_KEY', ''))
    SUPABASE_JWT_SECRET: str = field(default_factory=lambda: os.getenv('SUPABASE_JWT_SECRET', ''))
    
    # OpenAI
    OPENAI_API_KEY: str = field(default_factory=lambda: os.getenv('OPENAI_API_KEY', ''))
    OPENAI_ANALYSIS_MODEL: str = 'gpt-4o'
    OPENAI_FAST_MODEL: str = 'gpt-4o-mini'
    OPENAI_COACHING_MODEL: str = 'gpt-4o'
    OPENAI_WHISPER_MODEL: str = 'whisper-1'
    
    # AssemblyAI
    ASSEMBLYAI_API_KEY: str = field(default_factory=lambda: os.getenv('ASSEMBLYAI_API_KEY', ''))
    
    # Deepgram
    DEEPGRAM_API_KEY: str = field(default_factory=lambda: os.getenv('DEEPGRAM_API_KEY', ''))
    
    # CORS
    CORS_ORIGINS: List[str] = field(default_factory=lambda: os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(','))
    
    # Rate limiting
    RATE_LIMIT_ENABLED: bool = field(default_factory=lambda: os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true')
    RATE_LIMIT_DEFAULT: str = '60/minute'
    RATE_LIMIT_UPLOAD: str = '10/minute'
    RATE_LIMIT_ANALYSIS: str = '20/minute'
    
    # Upload settings
    MAX_FILE_SIZE_BYTES: int = 52_428_800  # 50 MB
    ALLOWED_AUDIO_TYPES: Set[str] = field(default_factory=lambda: frozenset({
        'audio/mpeg', 'audio/wav', 'audio/mp4',
        'audio/x-m4a', 'audio/ogg', 'audio/webm', 'audio/flac'
    }))
    
    # Storage bucket
    STORAGE_BUCKET: str = 'call-recordings'
    
    # API versioning
    API_PREFIX: str = '/api/v1'
    
    def validate(self) -> None:
        """Validate required configuration values."""
        required = [
            ('SUPABASE_URL', self.SUPABASE_URL),
            ('SUPABASE_SERVICE_ROLE_KEY', self.SUPABASE_SERVICE_ROLE_KEY),
            ('OPENAI_API_KEY', self.OPENAI_API_KEY),
        ]
        
        missing = [name for name, value in required if not value]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")


# Global config instance
config = Config()
