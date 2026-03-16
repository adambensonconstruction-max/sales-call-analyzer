"""Supabase client provider with connection pooling."""
import logging
from functools import lru_cache
from typing import Optional

from supabase import create_client, Client

from config import config

logger = logging.getLogger(__name__)

# Module-level cache for clients
_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create Supabase client with anon key.
    
    Returns:
        Configured Supabase client.
    """
    global _supabase_client
    
    if _supabase_client is None:
        if not config.SUPABASE_URL or not config.SUPABASE_ANON_KEY:
            raise ValueError("Supabase URL and anon key must be configured")
        
        _supabase_client = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_ANON_KEY
        )
        logger.debug("Created new Supabase client")
    
    return _supabase_client


def get_supabase_admin_client() -> Client:
    """Get or create Supabase client with service role key.
    
    This client bypasses RLS policies and should only be used
    for server-side operations.
    
    Returns:
        Configured Supabase admin client.
    """
    global _supabase_admin_client
    
    if _supabase_admin_client is None:
        if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("Supabase URL and service role key must be configured")
        
        _supabase_admin_client = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_SERVICE_ROLE_KEY
        )
        logger.debug("Created new Supabase admin client")
    
    return _supabase_admin_client


def reset_clients() -> None:
    """Reset cached clients (useful for testing)."""
    global _supabase_client, _supabase_admin_client
    _supabase_client = None
    _supabase_admin_client = None
    logger.debug("Reset Supabase clients")


class SupabaseStorage:
    """Helper class for Supabase Storage operations."""
    
    def __init__(self, admin: bool = True):
        """Initialize storage helper.
        
        Args:
            admin: If True, use admin client (bypasses RLS).
        """
        self.client = get_supabase_admin_client() if admin else get_supabase_client()
        self.bucket = config.STORAGE_BUCKET
    
    def upload_file(
        self,
        path: str,
        file_data: bytes,
        content_type: str
    ) -> dict:
        """Upload file to Supabase Storage.
        
        Args:
            path: Storage path (e.g., "user_id/filename.mp3").
            file_data: File bytes.
            content_type: MIME type.
            
        Returns:
            Upload response with path and URL.
        """
        try:
            result = self.client.storage.from_(self.bucket).upload(
                path=path,
                file=file_data,
                file_options={'content-type': content_type}
            )
            
            # Get public URL
            public_url = self.client.storage.from_(self.bucket).get_public_url(path)
            
            return {
                'path': path,
                'public_url': public_url,
                'size': len(file_data)
            }
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise
    
    def download_file(self, path: str) -> bytes:
        """Download file from Supabase Storage.
        
        Args:
            path: Storage path.
            
        Returns:
            File bytes.
        """
        try:
            result = self.client.storage.from_(self.bucket).download(path)
            return result
        except Exception as e:
            logger.error(f"Failed to download file: {e}")
            raise
    
    def delete_file(self, path: str) -> dict:
        """Delete file from Supabase Storage.
        
        Args:
            path: Storage path.
            
        Returns:
            Delete response.
        """
        try:
            result = self.client.storage.from_(self.bucket).remove([path])
            return result
        except Exception as e:
            logger.error(f"Failed to delete file: {e}")
            raise
    
    def create_signed_url(self, path: str, expires_in: int = 3600) -> str:
        """Create signed URL for temporary access.
        
        Args:
            path: Storage path.
            expires_in: Expiration time in seconds.
            
        Returns:
            Signed URL.
        """
        try:
            result = self.client.storage.from_(self.bucket).create_signed_url(
                path=path,
                expires_in=expires_in
            )
            return result.get('signedURL', '')
        except Exception as e:
            logger.error(f"Failed to create signed URL: {e}")
            raise
