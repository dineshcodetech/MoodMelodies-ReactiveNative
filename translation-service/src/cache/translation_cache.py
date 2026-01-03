import redis
import os
import logging
import hashlib
from typing import Optional

logger = logging.getLogger(__name__)


class TranslationCache:
    """
    Redis-based caching for translations
    Uses LRU eviction and TTL for efficient memory usage
    """
    
    def __init__(self):
        self.redis_client = None
        self.ttl = int(os.getenv('CACHE_TTL', 86400))  # 24 hours default
        self._connect()
    
    def _connect(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                password=os.getenv('REDIS_PASSWORD', None),
                db=int(os.getenv('REDIS_DB', 1)),
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Test connection
            self.redis_client.ping()
            logger.info('Connected to Redis cache')
            
        except Exception as e:
            logger.warning(f'Failed to connect to Redis: {e}. Running without cache.')
            self.redis_client = None
    
    def _generate_key(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Generate cache key for a translation
        Uses hash to keep key size reasonable
        """
        # Create a hash of the text for consistent key generation
        text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()[:16]
        return f'trans:{source_lang}:{target_lang}:{text_hash}'
    
    def get(self, text: str, source_lang: str, target_lang: str) -> Optional[str]:
        """
        Get cached translation
        
        Args:
            text: Source text
            source_lang: Source language code
            target_lang: Target language code
        
        Returns:
            Cached translation or None if not found
        """
        if not self.redis_client:
            return None
        
        try:
            key = self._generate_key(text, source_lang, target_lang)
            cached_value = self.redis_client.get(key)
            
            if cached_value:
                logger.debug(f'Cache hit: {key}')
                return cached_value
            
            logger.debug(f'Cache miss: {key}')
            return None
            
        except Exception as e:
            logger.error(f'Cache get error: {e}')
            return None
    
    def set(self, text: str, source_lang: str, target_lang: str, translation: str) -> bool:
        """
        Store translation in cache
        
        Args:
            text: Source text
            source_lang: Source language code
            target_lang: Target language code
            translation: Translated text
        
        Returns:
            True if successful, False otherwise
        """
        if not self.redis_client:
            return False
        
        try:
            key = self._generate_key(text, source_lang, target_lang)
            self.redis_client.setex(key, self.ttl, translation)
            logger.debug(f'Cache set: {key}')
            return True
            
        except Exception as e:
            logger.error(f'Cache set error: {e}')
            return False
    
    def clear(self):
        """Clear all translation cache"""
        if not self.redis_client:
            return
        
        try:
            # Delete all keys matching pattern
            cursor = 0
            while True:
                cursor, keys = self.redis_client.scan(cursor, match='trans:*', count=100)
                if keys:
                    self.redis_client.delete(*keys)
                if cursor == 0:
                    break
            
            logger.info('Translation cache cleared')
            
        except Exception as e:
            logger.error(f'Cache clear error: {e}')
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        if not self.redis_client:
            return {'connected': False}
        
        try:
            info = self.redis_client.info('stats')
            return {
                'connected': True,
                'total_connections': info.get('total_connections_received', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'used_memory': info.get('used_memory_human', 'N/A')
            }
        except Exception as e:
            logger.error(f'Failed to get cache stats: {e}')
            return {'connected': False, 'error': str(e)}
    
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        if not self.redis_client:
            return False
        
        try:
            self.redis_client.ping()
            return True
        except:
            return False


