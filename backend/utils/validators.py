"""Input validation utilities."""
import logging
from typing import Optional

from config import config
from middleware.error_handler import ValidationError

logger = logging.getLogger(__name__)


def validate_audio_file(file_data: bytes, content_type: Optional[str]) -> None:
    """Validate audio file upload.
    
    Args:
        file_data: File bytes.
        content_type: MIME type.
        
    Raises:
        ValidationError: If file is invalid.
    """
    # Check file size
    if len(file_data) > config.MAX_FILE_SIZE_BYTES:
        raise ValidationError(
            f"File size exceeds {config.MAX_FILE_SIZE_BYTES / 1024 / 1024:.0f}MB limit",
            details={'max_bytes': config.MAX_FILE_SIZE_BYTES, 'received_bytes': len(file_data)}
        )
    
    if len(file_data) == 0:
        raise ValidationError("File is empty")
    
    # Check content type
    if content_type and content_type not in config.ALLOWED_AUDIO_TYPES:
        raise ValidationError(
            f"Invalid file type: {content_type}",
            details={'allowed_types': list(config.ALLOWED_AUDIO_TYPES)}
        )
    
    # Basic file header validation
    if len(file_data) < 4:
        raise ValidationError("File too small to be valid audio")
    
    # Check file signatures
    header = file_data[:4]
    
    # MP3 (ID3 or MPEG sync)
    is_mp3 = header[:3] == b'ID3' or header[:2] == b'\xff\xfb' or header[:2] == b'\xff\xf3'
    
    # WAV (RIFF)
    is_wav = header[:4] == b'RIFF'
    
    # FLAC (fLaC)
    is_flac = header[:4] == b'fLaC'
    
    # OGG (OggS)
    is_ogg = header[:4] == b'OggS'
    
    # M4A (ftyp)
    is_m4a = header[4:8] == b'ftyp' or content_type in ['audio/mp4', 'audio/x-m4a']
    
    # WebM (1A 45 DF A3)
    is_webm = header[:4] == b'\x1aE\xdf\xa3'
    
    if not any([is_mp3, is_wav, is_flac, is_ogg, is_m4a, is_webm]):
        logger.warning(f"Unrecognized audio file signature: {header.hex()}")
        # Don't reject - content_type check should catch most issues
        # Some valid files might have unusual headers


def validate_uuid(uuid_str: str) -> bool:
    """Validate UUID string format.
    
    Args:
        uuid_str: UUID string to validate.
        
    Returns:
        True if valid UUID format.
    """
    import uuid
    try:
        uuid.UUID(uuid_str)
        return True
    except ValueError:
        return False


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage.
    
    Args:
        filename: Original filename.
        
    Returns:
        Sanitized filename.
    """
    import re
    # Remove path components and unsafe characters
    filename = re.sub(r'[^\w\s.-]', '', filename.split('/')[-1].split('\\')[-1])
    # Limit length
    return filename[:255]


def validate_email(email: str) -> bool:
    """Validate email format.
    
    Args:
        email: Email address.
        
    Returns:
        True if valid email format.
    """
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_string_length(
    value: str,
    min_length: int = 0,
    max_length: int = 1000,
    field_name: str = 'field'
) -> None:
    """Validate string length.
    
    Args:
        value: String to validate.
        min_length: Minimum allowed length.
        max_length: Maximum allowed length.
        field_name: Name of field for error message.
        
    Raises:
        ValidationError: If validation fails.
    """
    if len(value) < min_length:
        raise ValidationError(
            f"{field_name} must be at least {min_length} characters",
            details={'field': field_name, 'min_length': min_length}
        )
    
    if len(value) > max_length:
        raise ValidationError(
            f"{field_name} must be no more than {max_length} characters",
            details={'field': field_name, 'max_length': max_length}
        )
