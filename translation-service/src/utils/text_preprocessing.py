import re
import logging

logger = logging.getLogger(__name__)


def preprocess_text(text: str) -> str:
    """
    Preprocess text before translation
    
    - Normalize whitespace
    - Remove excessive punctuation
    - Handle special characters
    """
    if not text:
        return text
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    # Remove multiple punctuation marks (e.g., "!!!" -> "!")
    text = re.sub(r'([!?.]){2,}', r'\1', text)
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text


def postprocess_text(text: str) -> str:
    """
    Postprocess translated text
    
    - Fix spacing around punctuation
    - Capitalize first letter
    - Clean up formatting
    """
    if not text:
        return text
    
    # Remove spaces before punctuation
    text = re.sub(r'\s+([,.!?;:])', r'\1', text)
    
    # Add space after punctuation if missing
    text = re.sub(r'([,.!?;:])([A-Za-z])', r'\1 \2', text)
    
    # Capitalize first letter
    if text:
        text = text[0].upper() + text[1:]
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text


def detect_language(text: str) -> str:
    """
    Simple language detection based on character sets
    
    Returns:
        Language code ('en', 'hi', etc.) or 'unknown'
    """
    if not text:
        return 'unknown'
    
    # Check for Devanagari script (Hindi)
    devanagari_chars = sum(1 for char in text if '\u0900' <= char <= '\u097F')
    
    # Check for Latin script (English)
    latin_chars = sum(1 for char in text if 'a' <= char.lower() <= 'z')
    
    total_chars = len(text.replace(' ', ''))
    
    if total_chars == 0:
        return 'unknown'
    
    devanagari_ratio = devanagari_chars / total_chars
    latin_ratio = latin_chars / total_chars
    
    if devanagari_ratio > 0.3:
        return 'hi'
    elif latin_ratio > 0.5:
        return 'en'
    else:
        return 'unknown'


def chunk_text(text: str, max_length: int = 200) -> list:
    """
    Split long text into chunks for translation
    Tries to split at sentence boundaries
    """
    if len(text) <= max_length:
        return [text]
    
    # Split by sentences
    sentences = re.split(r'([.!?]+\s+)', text)
    
    chunks = []
    current_chunk = ''
    
    for i in range(0, len(sentences), 2):
        sentence = sentences[i]
        punctuation = sentences[i + 1] if i + 1 < len(sentences) else ''
        
        full_sentence = sentence + punctuation
        
        if len(current_chunk) + len(full_sentence) <= max_length:
            current_chunk += full_sentence
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = full_sentence
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks


