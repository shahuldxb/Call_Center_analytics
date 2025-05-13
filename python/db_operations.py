import os
import json
import pyodbc
from dotenv import load_dotenv
load_dotenv()
import hashlib
def get_db_connection():
    conn = pyodbc.connect(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={os.getenv('DB_SERVER')};"
        f"DATABASE={os.getenv('DB_NAME')};"
        f"UID={os.getenv('DB_USER')};"
        f"PWD={os.getenv('DB_PASSWORD')};"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )
    return conn

def hash_filename(filename):
    """Hash the filename using SHA256."""
    return hashlib.sha256(filename.encode('utf-8')).hexdigest()

def insert_deepgram_results_to_db(results, filename):
    conn = get_db_connection()
    cursor = conn.cursor()
    hashed_value = hash_filename(filename)
    # Check for existing record
    cursor.execute("SELECT COUNT(*) FROM DeepgramSpeechAnalysis WHERE filename = ?", (filename,))
    exists = cursor.fetchone()[0] > 0

    if exists:
        # If file exists, update timestamp only
        cursor.execute("UPDATE DeepgramSpeechAnalysis SET updated_at = CURRENT_TIMESTAMP WHERE filename = ?", (filename,))
    else:
        transcript = results.get('transcript', '')
        summary = results.get('summary', '')
        sentiment_data = results.get('sentiment', {})
        sentiment = sentiment_data.get('sentiment', '')
        sentiment_score = sentiment_data.get('sentiment_score', 0.0)

        # ---- ENTITY aggregation ----
        entities = results.get('entities', [])
        entity_labels = [e.get('label', '') for e in entities]
        entity_values = [e.get('value', '') for e in entities]
        entity_confidences = [e.get('confidence', 0.0) for e in entities]
        entity_start_words = [e.get('start_word', 0) for e in entities]
        entity_end_words = [e.get('end_word', 0) for e in entities]

        entity_label = ', '.join(entity_labels)
        entity_value = ', '.join(entity_values)
        entity_confidence = round(sum(entity_confidences) / len(entity_confidences), 4) if entity_confidences else 0.0
        entity_start_word = min(entity_start_words) if entity_start_words else 0
        entity_end_word = max(entity_end_words) if entity_end_words else 0

        # ---- INTENT aggregation ----
        segments = results.get('intents', {}).get('segments', [])
        intent_labels = []
        intent_confidences = []
        intent_texts = []
        intent_start_words = []
        intent_end_words = []

        for seg in segments:
            for intent in seg.get('intents', []):
                intent_labels.append(intent.get('intent', ''))
                intent_confidences.append(intent.get('confidence_score', 0.0))
                intent_texts.append(seg.get('text', ''))
                intent_start_words.append(seg.get('start_word', 0))
                intent_end_words.append(seg.get('end_word', 0))

        intent_label = ', '.join(intent_labels)
        intent_text = ' '.join(intent_texts)
        intent_confidence = round(sum(intent_confidences) / len(intent_confidences), 4) if intent_confidences else 0.0
        intent_start_word = min(intent_start_words) if intent_start_words else 0
        intent_end_word = max(intent_end_words) if intent_end_words else 0

        # ---- TOPIC aggregation ----
        topic_segments = results.get('topics', [])
        topic_labels = []
        topic_confidences = []
        topic_texts = []
        topic_start_words = []
        topic_end_words = []

        for topic_seg in topic_segments:
            for topic in topic_seg.get('topics', []):
                topic_labels.append(topic.get('topic', ''))
                topic_confidences.append(topic.get('confidence_score', 0.0))
                topic_texts.append(topic_seg.get('text', ''))
                topic_start_words.append(topic_seg.get('start_word', 0))
                topic_end_words.append(topic_seg.get('end_word', 0))

        topic_label = ', '.join(topic_labels)
        topic_text = ' '.join(topic_texts)
        topic_confidence = round(sum(topic_confidences) / len(topic_confidences), 4) if topic_confidences else 0.0
        topic_start_word = min(topic_start_words) if topic_start_words else 0
        topic_end_word = max(topic_end_words) if topic_end_words else 0

        # ---- SINGLE EXEC for all data ----
        cursor.execute("""
            EXEC InsertDeepgramSpeechAnalysis 
                @filename = ?, 
                @hashed_value = ?, 
                @transcript = ?, 
                @summary = ?, 
                @sentiment = ?, 
                @sentiment_score = ?, 
                @entity_label = ?, 
                @entity_value = ?, 
                @entity_start_word = ?, 
                @entity_end_word = ?, 
                @entity_confidence = ?, 
                @intent_label = ?, 
                @intent_confidence = ?, 
                @intent_start_word = ?, 
                @intent_end_word = ?, 
                @intent_text = ?, 
                @topic_label = ?, 
                @topic_confidence = ?, 
                @topic_start_word = ?, 
                @topic_end_word = ?, 
                @topic_text = ?
        """, (
            filename,
            hashed_value,
            transcript,
            summary,
            sentiment,
            sentiment_score,
            entity_label,
            entity_value,
            entity_start_word,
            entity_end_word,
            entity_confidence,
            intent_label,
            intent_confidence,
            intent_start_word,
            intent_end_word,
            intent_text,
            topic_label,
            topic_confidence,
            topic_start_word,
            topic_end_word,
            topic_text
        ))

    conn.commit()
    cursor.close()
    conn.close()
