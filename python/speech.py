# import azure.cognitiveservices.speech as speechsdk

# # Replace with your own values from the Azure portal
# speech_key = "EmpB9CnoqEAYqRMktBh1hxEqmu0K8yLQbRIznOfhICQ6cFXaX2BKJQQJ99BCACYeBjFXJ3w3AAAYACOG9dMh"
# service_region = "eastus"  # or your region

# # Path to your WAV file
# audio_file_path = "agricultural_finance_(murabaha)_normal.wav"  # Must be 16-bit PCM, mono, 16000 Hz

# # Set up the speech configuration
# speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)

# # Set up the audio configuration from the file
# audio_config = speechsdk.AudioConfig(filename=audio_file_path)

# # Create the recognizer
# speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

# # Start recognition
# print("Transcribing...")
# result = speech_recognizer.recognize_once()

# # Print the result
# if result.reason == speechsdk.ResultReason.RecognizedSpeech:
#     print("Recognized: {}".format(result.text))
# elif result.reason == speechsdk.ResultReason.NoMatch:
#     print("No speech could be recognized")
# elif result.reason == speechsdk.ResultReason.Canceled:
#     cancellation = result.cancellation_details
#     print("Speech Recognition canceled: {}".format(cancellation.reason))
#     if cancellation.reason == speechsdk.CancellationReason.Error:
#         print("Error details: {}".format(cancellation.error_details))




import azure.cognitiveservices.speech as speechsdk
import time

def transcribe_audio_from_file():
    # ✅ Azure credentials
    speech_key = "EmpB9CnoqEAYqRMktBh1hxEqmu0K8yLQbRIznOfhICQ6cFXaX2BKJQQJ99BCACYeBjFXJ3w3AAAYACOG9dMh"
    service_region = "eastus"

    # ✅ Path to your local audio file (.wav)
    audio_file_path = "agricultural_finance_(murabaha)_normal.wav"  # Replace with your file path

    # 🔧 Config setup
    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
    audio_config = speechsdk.audio.AudioConfig(filename=audio_file_path)

    # 🎤 Create the recognizer
    speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

    # ⏳ Wait flag
    done = False

    # 🔌 Event callbacks
    def recognized(evt):
        print(f"Recognized: {evt.result.text}")

    def stop_cb(evt):
        print("Recognition stopped.")
        nonlocal done
        done = True

    def canceled(evt):
        print(f"Canceled: {evt.reason}")
        if evt.reason == speechsdk.CancellationReason.Error:
            print(f"Error details: {evt.error_details}")
        done = True

    # 🎧 Connect events
    speech_recognizer.recognized.connect(recognized)
    speech_recognizer.session_stopped.connect(stop_cb)
    speech_recognizer.canceled.connect(canceled)

    # 🚀 Start continuous recognition
    speech_recognizer.start_continuous_recognition()
    while not done:
        time.sleep(0.5)
    speech_recognizer.stop_continuous_recognition()

# ✅ Call the function
transcribe_audio_from_file()
