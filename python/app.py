from flask import Flask, jsonify, request,send_file, send_from_directory
from flask_cors import CORS
import os
from extact import generateSummary, text_analytics_client
from DocumentTranslation import upload_and_translate_documents,generate_file_url
import logging
from predict_only import predict  
from Topics import process_topic_modeling
import tensorflow as tf
import numpy as np
import librosa
import pandas as pd
from DeepTranscript import analyze_audio_with_deepgram
import requests
from werkzeug.utils import secure_filename
from audio import process_audio_file
import os

app = Flask(__name__)
CORS(app)
cors = CORS(app, resources={r"/predict": {"origins": "http://localhost:3000"}})
model = tf.keras.models.load_model('emotion_recognition_model.h5')

# Load the OneHotEncoder for decoding labels
enc = pd.read_pickle('label_encoder.pkl')  
# Define Feature Extraction Function
def extract_mfcc(filename):
    y, sr = librosa.load(filename, duration=3, offset=0.5)
    mfcc = np.mean(librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40).T, axis=0)
    return mfcc

@app.route('/predict', methods=['POST'])
def predict():
    if 'audioFile' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['audioFile']
    print('file name:',file.filename)
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    try:
        if not os.path.exists('temp'):
            os.makedirs('temp')
        filepath = f'temp/{file.filename}'
        file.save(filepath)
        # Extract features and make predictions
        mfcc = extract_mfcc(filepath)
        mfcc = np.expand_dims(mfcc, axis=0)
        mfcc = np.expand_dims(mfcc, -1)
        prediction = model.predict(mfcc)
        predicted_label = np.argmax(prediction, axis=1)
        emotion_dict = enc.categories_[0]
        predicted_emotion = emotion_dict[predicted_label[0]]
        print('predicted emotion:',predicted_emotion)
        print('confidence:',prediction)
        return jsonify({
            'filename': file.filename,
            'emotion': predicted_emotion,
            'confidence': float(np.max(prediction))
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/topic-modeling', methods=['POST'])
def topic_modeling():
    data = request.get_json()
    # Extract the text documents from the request
    text_documents = data.get('textDocuments', [])
    print('Received textDocuments:', text_documents)

    # Validate if we received any documents
    if not text_documents:
        return jsonify({"error": "No text documents provided"}), 400

    # Process topic modeling
    results = process_topic_modeling(text_documents)
    print("Processed Results:", results)

    # Return the results
    return jsonify({"results": results})


@app.route('/api/generate-summary', methods=['POST'])
def api_generate_summary():
    data = request.get_json()
    text_documents = data.get('text_documents', [])
    print("textDocuments for summary:",text_documents)
    # Ensure all documents are in the correct format
    documents = [{'id': str(idx), 'language': 'en', 'text': doc} for idx, doc in enumerate(text_documents)]
    # Use the globally initialized text_analytics_client
    result = generateSummary(documents,text_analytics_client)
    return jsonify(result)

@app.route('/translate-documents', methods=['POST'])
def translate_documents():
    files = request.files.getlist('files')
    languages = request.form.getlist('languages')
    print('files',files)
    print('languages',languages)
    # Assuming files are sent with the 'files' key
    if not files:
        return jsonify({"error": "No files provided"}), 400
    try:
        # Call the function to handle document upload and translation
        translation_results = upload_and_translate_documents(files,languages)
        print('translation_results',translation_results)
        return jsonify(translation_results), 200
    except Exception as e:
        logging.error('Failed to translate documents', exc_info=True)
        return jsonify({"error": str(e)}), 500
    
@app.route('/download-file/<path:file_path>', methods=['GET'])
def download_file(file_path):
    file_url = generate_file_url(file_path)
    print('file_url',file_url)
    return jsonify({"file_url": file_url}), 200



# # deepgram (synchronous)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
uploaded_filename = None 

## deepgram synchronous process
@app.route('/audio', methods=['POST'])
def upload_audio():
    if not request.files:
        return jsonify({"error": "No audio file provided"}), 400
    results = []                                                                                            
    for key in request.files:
        audio = request.files[key]
        filename = audio.filename
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        audio.save(file_path)
        try:
            NGROK_API_URL = "http://127.0.0.1:4040/api/tunnels"
            ngrok_response = requests.get(NGROK_API_URL).json()
            public_url = ngrok_response["tunnels"][0]["public_url"]
            audio_url = public_url + f"/audio?filename={filename}"
            deepgram_results = analyze_audio_with_deepgram(audio_url)
            results.append({
                "filename": filename,
                "results": deepgram_results
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({
        "message": "All files uploaded and analyzed successfully",
        "results": results
    })

@app.route('/audio', methods=['GET'])
def serve_uploaded_audio():
    filename = request.args.get('filename')
    if not filename:
        return jsonify({"error": "Filename is required"}), 400
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=False)


#whisper
@app.route('/process-audio', methods=['POST'])
def process_audio():
    if not request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    files = request.files.getlist('files')
    print("files:", files)
    if not files:
        return jsonify({'error': 'Empty files list received'}), 400

    results = []
    for file in files:
        if file.filename == '':
            continue  # Skip empty file fields
        
        try:
            filename = secure_filename(file.filename)
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            print(f"Saving file to {filepath}")

            # Ensure the upload folder exists
            if not os.path.exists(UPLOAD_FOLDER):
                os.makedirs(UPLOAD_FOLDER)

            file.save(filepath)
            print(f"File saved successfully: {filepath}")

            # Process the audio file
            result = process_audio_file(filepath)
            print(f"Processing result: {result}")

            results.append({
                'filename': filename,
                'transcription': result['transcription'],
                'translation': result['translation']
            })

            os.remove(filepath)
            print(f"File removed: {filepath}")
        except Exception as e:
            print(f"Error processing file {file.filename}: {str(e)}")
            return jsonify({'error': f'Failed to process file {file.filename}: {str(e)}'}), 500

    if not results:
        return jsonify({'error': 'No valid files processed'}), 400

    return jsonify(results)

if __name__ == '__main__':
    print("Starting Flask server...")
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=True, threaded=True)