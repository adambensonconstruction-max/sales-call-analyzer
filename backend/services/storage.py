"""Storage service for file operations."""
import logging
import uuid
from typing import Dict, Any
from pathlib import Path

from config import config
from providers.supabase import SupabaseStorage
from middleware.error_handler import ExternalServiceError

logger = logging.getLogger(__name__)


class StorageService:
    """Service for handling file storage operations."""
    
    def __init__(self):
        """Initialize storage service."""
        self.storage = SupabaseStorage(admin=True)
    
    def generate_storage_path(
        self,
        user_id: str,
        original_filename: str
    ) -> str:
        """Generate a unique storage path for a file.
        
        Args:
            user_id: The user ID.
            original_filename: Original filename.
            
        Returns:
            Storage path in format: user_id/uuid.ext
        """
        ext = Path(original_filename).suffix.lower()
        if not ext:
            ext = '.mp3'  # Default extension
        
        file_id = str(uuid.uuid4())
        return f"{user_id}/{file_id}{ext}"
    
    def upload_call_recording(
        self,
        user_id: str,
        file_data: bytes,
        original_filename: str,
        content_type: str
    ) -> Dict[str, Any]:
        """Upload a call recording to storage.
        
        Args:
            user_id: The user ID.
            file_data: File bytes.
            original_filename: Original filename for extension.
            content_type: MIME type.
            
        Returns:
            Upload result with path and URL.
        """
        try:
            path = self.generate_storage_path(user_id, original_filename)
            result = self.storage.upload_file(path, file_data, content_type)
            
            logger.info(f"Uploaded call recording for user {user_id}: {path}")
            return result
        except Exception as e:
            logger.error(f"Failed to upload call recording: {e}")
            raise ExternalServiceError(f"Failed to upload file: {str(e)}")
    
    def delete_call_recording(self, path: str) -> None:
        """Delete a call recording from storage.
        
        Args:
            path: Storage path.
        """
        try:
            self.storage.delete_file(path)
            logger.info(f"Deleted call recording: {path}")
        except Exception as e:
            logger.error(f"Failed to delete call recording: {e}")
            raise ExternalServiceError(f"Failed to delete file: {str(e)}")
    
    def get_download_url(self, path: str, expires_in: int = 3600) -> str:
        """Get temporary download URL for a file.
        
        Args:
            path: Storage path.
            expires_in: URL expiration in seconds.
            
        Returns:
            Signed URL.
        """
        try:
            return self.storage.create_signed_url(path, expires_in)
        except Exception as e:
            logger.error(f"Failed to create download URL: {e}")
            raise ExternalServiceError(f"Failed to create download URL: {str(e)}")
