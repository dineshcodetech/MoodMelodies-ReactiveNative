from transformers import MarianMTModel, MarianTokenizer
import torch
import os
import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)


class MarianTranslator:
    """
    MarianMT-based translator for efficient neural machine translation
    Uses Helsinki-NLP models from HuggingFace
    """
    
    def __init__(self):
        self.device = 'cuda' if torch.cuda.is_available() and os.getenv('USE_GPU', 'false') == 'true' else 'cpu'
        self.models: Dict[Tuple[str, str], MarianMTModel] = {}
        self.tokenizers: Dict[Tuple[str, str], MarianTokenizer] = {}
        self.cache_dir = os.getenv('MODEL_CACHE_DIR', './models')
        
        logger.info(f'MarianTranslator initialized on device: {self.device}')
        
        # Preload common models
        self._preload_models()
    
    def _preload_models(self):
        """Preload commonly used models"""
        common_pairs = [
            ('en', 'hi'),
            ('hi', 'en')
        ]
        
        for source, target in common_pairs:
            try:
                self._load_model(source, target)
                logger.info(f'Preloaded model: {source}->{target}')
            except Exception as e:
                logger.warning(f'Failed to preload model {source}->{target}: {e}')
    
    def _get_model_name(self, source_lang: str, target_lang: str) -> str:
        """Get HuggingFace model name for language pair"""
        # Helsinki-NLP model naming convention
        model_map = {
            ('en', 'hi'): 'Helsinki-NLP/opus-mt-en-hi',
            ('hi', 'en'): 'Helsinki-NLP/opus-mt-hi-en',
            # Add more language pairs as needed
        }
        
        return model_map.get((source_lang, target_lang))
    
    def _load_model(self, source_lang: str, target_lang: str):
        """Load model and tokenizer for a language pair"""
        pair = (source_lang, target_lang)
        
        if pair in self.models:
            return  # Already loaded
        
        model_name = self._get_model_name(source_lang, target_lang)
        
        if not model_name:
            raise ValueError(f'Unsupported language pair: {source_lang} -> {target_lang}')
        
        logger.info(f'Loading model: {model_name}')
        
        try:
            # Load tokenizer
            tokenizer = MarianTokenizer.from_pretrained(
                model_name,
                cache_dir=self.cache_dir
            )
            
            # Load model
            model = MarianMTModel.from_pretrained(
                model_name,
                cache_dir=self.cache_dir
            )
            
            # Move to device
            model = model.to(self.device)
            model.eval()  # Set to evaluation mode
            
            self.tokenizers[pair] = tokenizer
            self.models[pair] = model
            
            logger.info(f'Model loaded successfully: {model_name}')
            
        except Exception as e:
            logger.error(f'Failed to load model {model_name}: {e}')
            raise
    
    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate text from source to target language
        
        Args:
            text: Input text to translate
            source_lang: Source language code (e.g., 'en')
            target_lang: Target language code (e.g., 'hi')
        
        Returns:
            Translated text
        """
        pair = (source_lang, target_lang)
        
        # Load model if not already loaded
        if pair not in self.models:
            self._load_model(source_lang, target_lang)
        
        tokenizer = self.tokenizers[pair]
        model = self.models[pair]
        
        try:
            # Tokenize input
            inputs = tokenizer(
                text,
                return_tensors='pt',
                padding=True,
                truncation=True,
                max_length=512
            ).to(self.device)
            
            # Generate translation
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_length=512,
                    num_beams=4,  # Beam search for better quality
                    early_stopping=True
                )
            
            # Decode output
            translated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            return translated_text
            
        except Exception as e:
            logger.error(f'Translation error: {e}')
            raise
    
    def get_loaded_models(self) -> list:
        """Get list of currently loaded models"""
        return [f'{s}->{t}' for s, t in self.models.keys()]
    
    def get_model_name(self, source_lang: str, target_lang: str) -> str:
        """Get model name for a language pair"""
        return self._get_model_name(source_lang, target_lang)
    
    def unload_model(self, source_lang: str, target_lang: str):
        """Unload a model to free memory"""
        pair = (source_lang, target_lang)
        
        if pair in self.models:
            del self.models[pair]
            del self.tokenizers[pair]
            
            if self.device == 'cuda':
                torch.cuda.empty_cache()
            
            logger.info(f'Model unloaded: {source_lang}->{target_lang}')


