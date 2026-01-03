from flask import Flask, request, jsonify
from prometheus_client import Counter, Histogram, generate_latest
from dotenv import load_dotenv
import os
import logging
import time

from models.marian_translator import MarianTranslator
from cache.translation_cache import TranslationCache
from utils.text_preprocessing import preprocess_text, postprocess_text

load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Prometheus metrics
translation_counter = Counter('translations_total', 'Total number of translations')
translation_latency = Histogram('translation_latency_seconds', 'Translation latency')
cache_hit_counter = Counter('cache_hits_total', 'Total cache hits')
cache_miss_counter = Counter('cache_misses_total', 'Total cache misses')

# Initialize services
translator = MarianTranslator()
cache = TranslationCache()

# Supported language pairs
SUPPORTED_PAIRS = [
    ('en', 'hi'),
    ('hi', 'en')
]


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': translator.get_loaded_models(),
        'cache_connected': cache.is_connected()
    }), 200


@app.route('/api/v1/translate', methods=['POST'])
@translation_latency.time()
def translate():
    """
    Translate text from source to target language
    
    Request JSON:
    {
        "text": "Hello, how are you?",
        "source_lang": "en",
        "target_lang": "hi"
    }
    
    Response JSON:
    {
        "translated_text": "नमस्ते, आप कैसे हैं?",
        "source_lang": "en",
        "target_lang": "hi",
        "model": "Helsinki-NLP/opus-mt-en-hi",
        "cached": false,
        "latency_ms": 45
    }
    """
    start_time = time.time()
    
    try:
        # Validate request
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Invalid JSON'}), 400
        
        text = data.get('text')
        source_lang = data.get('source_lang')
        target_lang = data.get('target_lang')
        
        if not text or not source_lang or not target_lang:
            return jsonify({
                'error': 'Missing required fields: text, source_lang, target_lang'
            }), 400
        
        if len(text) > int(os.getenv('MAX_LENGTH', '512')):
            return jsonify({
                'error': f'Text too long. Max length: {os.getenv("MAX_LENGTH", "512")}'
            }), 400
        
        # Validate language pair
        if (source_lang, target_lang) not in SUPPORTED_PAIRS:
            return jsonify({
                'error': f'Unsupported language pair: {source_lang} -> {target_lang}',
                'supported_pairs': [f'{s}->{t}' for s, t in SUPPORTED_PAIRS]
            }), 400
        
        # Check cache
        cached_translation = cache.get(text, source_lang, target_lang)
        
        if cached_translation:
            cache_hit_counter.inc()
            translation_counter.inc()
            latency_ms = (time.time() - start_time) * 1000
            
            logger.info(f'Cache hit: {source_lang}->{target_lang}, latency: {latency_ms:.2f}ms')
            
            return jsonify({
                'translated_text': cached_translation,
                'source_lang': source_lang,
                'target_lang': target_lang,
                'cached': True,
                'latency_ms': round(latency_ms, 2)
            }), 200
        
        # Cache miss - perform translation
        cache_miss_counter.inc()
        
        # Preprocess text
        preprocessed_text = preprocess_text(text)
        
        # Translate
        translated_text = translator.translate(preprocessed_text, source_lang, target_lang)
        
        # Postprocess text
        final_text = postprocess_text(translated_text)
        
        # Store in cache
        cache.set(text, source_lang, target_lang, final_text)
        
        translation_counter.inc()
        latency_ms = (time.time() - start_time) * 1000
        
        logger.info(f'Translation: {source_lang}->{target_lang}, latency: {latency_ms:.2f}ms')
        
        return jsonify({
            'translated_text': final_text,
            'source_lang': source_lang,
            'target_lang': target_lang,
            'model': translator.get_model_name(source_lang, target_lang),
            'cached': False,
            'latency_ms': round(latency_ms, 2)
        }), 200
        
    except Exception as e:
        logger.error(f'Translation error: {str(e)}', exc_info=True)
        return jsonify({
            'error': 'Translation failed',
            'details': str(e)
        }), 500


@app.route('/api/v1/languages', methods=['GET'])
def get_languages():
    """Get supported language pairs"""
    return jsonify({
        'supported_pairs': [
            {'source': source, 'target': target}
            for source, target in SUPPORTED_PAIRS
        ]
    }), 200


@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest(), 200


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f'Internal error: {error}')
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f'Starting translation service on port {port}')
    logger.info(f'GPU enabled: {os.getenv("USE_GPU", "false")}')
    
    app.run(host='0.0.0.0', port=port, debug=debug)


