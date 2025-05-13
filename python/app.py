from flask import Flask, jsonify, request, send_from_directory,Response, stream_with_context
from flask_cors import CORS
import os
from extact import generateSummary, text_analytics_client
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
import json
from db_operations import insert_deepgram_results_to_db
from dotenv import load_dotenv
load_dotenv()

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

# # deepgram
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
uploaded_filename = None 

## deepgram 
# @app.route('/audio', methods=['POST'])
# def upload_audio():
#     if not request.files:
#         return jsonify({"error": "No audio file provided"}), 400
#     results = []                                                                                            
#     for key in request.files:
#         audio = request.files[key]
#         filename = audio.filename
#         file_path = os.path.join(UPLOAD_FOLDER, filename)
#         audio.save(file_path)
#         try:
#             NGROK_API_URL = "http://127.0.0.1:4040/api/tunnels"
#             ngrok_response = requests.get(NGROK_API_URL).json()
#             public_url = ngrok_response["tunnels"][0]["public_url"]
#             audio_url = public_url + f"/audio?filename={filename}"
#             deepgram_results = analyze_audio_with_deepgram(audio_url)
#             if "error" in deepgram_results:
#                 return jsonify({"error": deepgram_results["error"]}), 500
#             # Insert results into the database
#             insert_deepgram_results_to_db(deepgram_results, filename)
#             results.append({
#                 "filename": filename,
#                 "results": deepgram_results
#             })
#         except Exception as e:
#             return jsonify({"error": str(e)}), 500
#     return jsonify({
#         "message": "All files uploaded and analyzed successfully",
#         "results": results
#     })

# @app.route('/audio', methods=['GET'])
# def serve_uploaded_audio():
#     filename = request.args.get('filename')
#     if not filename:
#         return jsonify({"error": "Filename is required"}), 400
#     file_path = os.path.join(UPLOAD_FOLDER, filename)
#     if not os.path.exists(file_path):
#         return jsonify({"error": "File not found"}), 404
#     return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=False)


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
        insert_deepgram_results_to_db(deepgram_results, filename)
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

@app.route('/process-audio-stream', methods=['POST'])
def process_audio_stream():
    if not request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    files = request.files.getlist('files')

    def generate():
        for file in files:
            if file.filename == '':
                continue
            try:
                filename = secure_filename(file.filename)
                filepath = os.path.join(UPLOAD_FOLDER, filename)

                if not os.path.exists(UPLOAD_FOLDER):
                    os.makedirs(UPLOAD_FOLDER)

                file.save(filepath)
                result = process_audio_file(filepath)
                os.remove(filepath)

                yield f"data: {json.dumps({'filename': filename, 'transcription': result['transcription'], 'translation': result['translation']})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': f'Failed to process {file.filename}: {str(e)}'})}\n\n"

        yield "event: end\ndata: done\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')


if __name__ == '__main__':
    print("Starting Flask server...")
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=True, threaded=True)