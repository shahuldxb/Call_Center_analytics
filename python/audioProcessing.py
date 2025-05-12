import os
import whisper
from transformers import pipeline
def transcribe_audio(audio_path):
    print(f"Transcribing: {audio_path}")
    model = whisper.load_model("base")
    result = model.transcribe(audio_path)
    return result["text"]

def translate_audio(audio_path):
    print(f"Translating: {audio_path}")
    model = whisper.load_model("medium")
    result = model.transcribe(audio_path, task="translate")
    return result["text"]
def process_audio_file(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    transcription = transcribe_audio(file_path)
    translated_text = translate_audio(file_path)
    return transcription, translated_text
