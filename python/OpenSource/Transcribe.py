import nltk
import whisper
from transformers import pipeline
from bertopic import BERTopic
from presidio_analyzer import AnalyzerEngine
from pydub import AudioSegment

nltk.download('punkt')


# ---------- 1. AUDIO TO TEXT (Whisper) ----------
def transcribe_audio_whisper(audio_path):
    model = whisper.load_model("base")  # Use "small", "medium", "large" for better accuracy
    result = model.transcribe(audio_path)
    return result["text"]


# ---------- 2. SUMMARIZATION (HuggingFace Falcon/BART) ----------
def summarize_text(text):
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    summary = summarizer(text, max_length=100, min_length=30, do_sample=False)
    return summary[0]['summary_text']


# ---------- 3. SENTIMENT ANALYSIS (CardiffNLP) ----------
def analyze_sentiment(text):
    sentiment_analyzer = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment")
    return sentiment_analyzer(text)[0]


# ---------- 4. TOPIC MODELING (BERTopic) ----------
def topic_modeling(text):
    topic_model = BERTopic()
    topics, _ = topic_model.fit_transform([text])
    return topic_model.get_topic_info().head()


# ---------- 5. PII DETECTION (Presidio) ----------
def detect_pii(text):
    analyzer = AnalyzerEngine()
    results = analyzer.analyze(text=text, language='en')
    pii_items = [{"entity_type": r.entity_type, "start": r.start, "end": r.end} for r in results]
    return pii_items


# ---------- MAIN ----------
if __name__ == "__main__":
    audio_file = "C:/Users/madhu/OneDrive/Desktop/AudioFile/Backend/Applycreditcard-negative.wav"

    # Convert audio to a compatible format for Whisper
    print("Converting audio...")
    audio = AudioSegment.from_file(audio_file)
    audio.export("converted.wav", format="wav")

    print("\nTranscribing with Whisper...")
    transcript = transcribe_audio_whisper("converted.wav")
    print("\nTranscript:\n", transcript)

    print("\nSummarizing...")
    summary = summarize_text(transcript)
    print("\nSummary:\n", summary)

    print("\nAnalyzing sentiment...")
    sentiment = analyze_sentiment(transcript)
    print("\nSentiment:\n", sentiment)

    print("\nDetecting PII...")
    pii = detect_pii(transcript)
    print("\nPII Entities:\n", pii)

    print("\nTopic Modeling...")
    topics = topic_modeling(transcript)
    print("\nTopics:\n", topics)
