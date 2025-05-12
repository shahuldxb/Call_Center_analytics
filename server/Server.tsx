const dbOperation = require("./dbFiles/dbOperation");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const stream = require("stream");
const nodemailer = require("nodemailer");
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const jwt = require("jsonwebtoken");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args)); 

const {
  AZURE_STORAGE_CONNECTION_STRING,
  SPEECH_API_SERVICE_REGION,
  SPEECH_API_SUBSCRIPTION_KEY,
  TRANSLATOR_TEXT_ENDPOINT,
  TRANSLATOR_DOCUMENT_ENDPOINT,
  TRANSLATOR_DOCUMENT_KEY,
  LANGUAGE_ENDPOINT,
  LANGUAGE_KEY,
} = require("./config/config");

const {
  AzureKeyCredential,
  TextAnalysisClient,
} = require("@azure/ai-language-text");
const { TextAnalyticsClient } = require("@azure/ai-text-analytics");

const {
  SpeechConfig,
  AudioConfig,
  SpeechRecognizer,
  ResultReason,
  CancellationReason,
  ConversationTranscriber,
  PronunciationAssessmentConfig,
  PronunciationAssessmentResult,
  PronunciationAssessmentGradingSystem,
  PronunciationAssessmentGranularity,
  AutoDetectSourceLanguageConfig,
  PropertyId,
  AutoDetectSourceLanguageResult,
  AudioInputStream,
} = require("microsoft-cognitiveservices-speech-sdk");
const { BlobServiceClient } = require("@azure/storage-blob");
const textAnalyticsClient = new TextAnalyticsClient(
  LANGUAGE_ENDPOINT,
  new AzureKeyCredential(LANGUAGE_KEY)
);
const blobServiceClient = BlobServiceClient.fromConnectionString(
  AZURE_STORAGE_CONNECTION_STRING
);
const speechConfig = SpeechConfig.fromSubscription(
  SPEECH_API_SUBSCRIPTION_KEY,
  SPEECH_API_SERVICE_REGION
);


const PORT = process.env.PORT || 5001;

const multer = require("multer");
const { error } = require("console");
const app = express();

app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Configure multer to handle FormData
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "Uploads"));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage, dest: "Uploads/" });

app.get("/", (req, res) => {
  res.send("HELLO, this is the root URL!!!");
});

app.post("/save_login", async (req, res) => {
  const { username, emailID, password } = req.body;
  try {
    console.log("Received login: ", req.body);
    console.log("username: ", username);
    console.log("emailID: ", emailID);
    console.log("password: ", password);
    await dbOperation.saveLoginCredentials(username, emailID, password);
    res.status(200).json({ message: "User is successfully registered" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: "Failed to register" });
  }
});

app.post("/register", async (req, res) => {
  const { username, email, passwordHash } = req.body;
  console.log("Received email:", email);
  console.log("Received password:", passwordHash);
  try {
    // Check if the email already exists in the database
    const existingUser = await dbOperation.getUserByEmail(email);
    if (existingUser) {
      // If the email already exists, send an error response
      return res.status(400).json({ error: "Email already exists" });
    }
    // If the email doesn't exist, proceed with user registration
    await dbOperation.registerUser(username, email, passwordHash);
    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.post("/login", async (req, res) => {
  const { email, passwordHash } = req.body;
  try {
    const { isAuthenticated, userName } = await dbOperation.loginUser(
      email,
      passwordHash
    );
    if (isAuthenticated) {
      res.status(200).json({ message: "Login successful", userName });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to login user" });
  }
});

app.post("/google-register", async (req, res) => {
  const { username, email, picture } = req.body;

  try {
    const existingUser = await dbOperation.getUserByEmail(email);

    if (existingUser) {
      return res
        .status(200)
        .json({ message: "User already exists", user: existingUser });
    }

    // Register new user
    await dbOperation.registerUser(username, email, "GOOGLE_AUTH"); // Placeholder for password
    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log(`Generated OTP: ${otp}`);

    // Save OTP to database
    const isSaved = await dbOperation.saveOTP(email, otp);
    if (!isSaved) return res.status(500).json({ error: "Failed to save OTP" });

    // Send OTP via email
    const isSent = await dbOperation.sendOTPEmail(email, otp);
    if (!isSent)
      return res.status(500).json({ error: "Failed to send OTP email" });

    setTimeout(() => {
      dbOperation
        .deleteOTPRecord(email, otp)
        .then(() => console.log(`OTP for ${email} deleted after 1 minute`))
        .catch((err) => console.error("Error deleting OTP:", err));
    }, 60 * 1000);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Fetch OTP record
    const otpRecord = await dbOperation.getOTPRecord(email, otp);

    if (!otpRecord) {
      return res.status(401).json({ message: "Invalid OTP." });
    }

    const { expiry } = otpRecord;

    // Check OTP expiration
    const currentTime = new Date();
    if (currentTime > new Date(expiry)) {
      await dbOperation.deleteOTPRecord(email, otp);
      return res.status(400).json({ message: "OTP has expired." });
    }

    // OTP is valid, delete it and respond with success
    await dbOperation.deleteOTPRecord(email, otp);
    res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Failed to verify OTP." });
  }
});

app.put("/update-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email and new password are required" });
  }

  try {
    const lowercaseEmail = email.toLowerCase();

    // Call the DB operation function
    const updateResult = await dbOperation.updatePassword(
      lowercaseEmail,
      newPassword
    );

    if (!updateResult.success) {
      return res
        .status(updateResult.status)
        .json({ message: updateResult.message });
    }

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Error updating password" });
  }
});

app.get("/gettablename", async (req, res) => {
  try {
    const Tablename = await dbOperation.getTablenames();
    res.json(Tablename.recordset);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error for Tablename" });
  }
});

app.post("/tablenamecategories", async (req, res) => {
  const { tableName } = req.body;
  console.log("Received POST request with tableName:", tableName); // Log to see if you received the table name correctly
  try {
    console.log("Fetching categories for tableName:", tableName); // Log to see if you're attempting to fetch categories
    const categories = await dbOperation.getCategoriesForTable(tableName);
    console.log("Fetched categories:", categories); // Log the fetched categories
    res.json({ categories });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/insertData", upload.none(), async (req, res) => {
  const { tableName, dataToInsert } = req.body; // Extract tableName and dataToInsert from the request body
  console.log("Received POST request with tableName:", req.body); // Log to see if you received the table name correctly
  try {
    // Assuming you have a function to insert data into your database
    await dbOperation.insertData(tableName, dataToInsert); // Provide both tableName and dataToInsert

    res.json({ message: "Data inserted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/updateData", upload.none(), async (req, res) => {
  const { tableName, dataToUpdate } = req.body; // Extract tableName and dataToInsert from the request body
  console.log("Received POST request with tableName:", req.body); // Log to see if you received the table name correctly
  try {
    // Assuming you have a function to insert data into your database
    await dbOperation.UpdateData(tableName, dataToUpdate); // Provide both tableName and dataToInsert

    res.json({ message: "Data updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/tablecategorieswithvalue", async (req, res) => {
  const { tableName } = req.body;
  console.log("Received POST request with tableName:", tableName); // Log to see if you received the table name correctly
  try {
    console.log("Fetching rowvalues for tableName:", tableName); // Log to see if you're attempting to fetch categories
    const rowvalues = await dbOperation.getTablenameswithvalue(tableName);
    console.log("Fetched rowvalues:", rowvalues); // Log the fetched rowvalues
    res.json(rowvalues);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// const transcribeAudioFile = async (fileContent, language) => {
//   try {
//     const subscriptionKey = SPEECH_API_SUBSCRIPTION_KEY;
//     const serviceRegion = SPEECH_API_SERVICE_REGION;
//     const speechConfig = SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
//     speechConfig.speechRecognitionLanguage = language || "en-US"; 
//     const audioConfig = AudioConfig.fromWavFileInput(fileContent);
//     const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
//     return new Promise((resolve, reject) => {
//       let recognizedText = ""; 
//       recognizer.recognized = (s, e) => {
//         if (e.result && e.result.reason === ResultReason.RecognizedSpeech) {
//           recognizedText += e.result.text + " ";
//         }
//       };
//       recognizer.canceled = (s, e) => {
//         if (e.reason === CancellationReason.Error) {
//           reject(new Error(`Speech Recognition error: ${e.errorDetails}`));
//         } else if (e.reason === CancellationReason.EndOfStream && recognizedText.trim() !== "") {
//           resolve(recognizedText.trim());
//         } else {
//           reject(new Error(`Speech Recognition canceled: ${e.reason}`));
//         }
//       };
//       recognizer.startContinuousRecognitionAsync();
//       recognizer.sessionStopped = async (s, e) => {
//         recognizer.close();
//         if (recognizedText.trim() !== "") {
//           resolve(recognizedText.trim());
//         } else {
//           reject(new Error(`Speech Recognition session stopped without recognized speech`));
//         }
//       };
//     });
//   } catch (error) {
//     console.error("Error in transcription:", error);
//     throw new Error(`Error in transcription: ${error}`);
//   }
// };

const transcribeAudioFile = async (fileContent, language) => {
  try {
    const subscriptionKey = SPEECH_API_SUBSCRIPTION_KEY;
    const serviceRegion = SPEECH_API_SERVICE_REGION;

    const speechConfig = SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    speechConfig.speechRecognitionLanguage = language || "en-US";
    
    const audioConfig = AudioConfig.fromWavFileInput(fileContent);
    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    return new Promise((resolve, reject) => {
      let recognizedText = "";

      recognizer.recognized = (s, e) => {
        if (e.result && e.result.reason === ResultReason.RecognizedSpeech) {
          console.log("Recognized:", e.result.text);
          recognizedText += e.result.text + " ";
        }
      };

      recognizer.canceled = (s, e) => {
        console.log("Recognition canceled:", e.reason);
        if (e.reason === CancellationReason.Error) {
          console.error("Error details:", e.errorDetails);
          reject(new Error(`Speech Recognition error: ${e.errorDetails}`));
        } else if (e.reason === CancellationReason.EndOfStream && recognizedText.trim() !== "") {
          resolve(recognizedText.trim());
        } else {
          reject(new Error(`Speech Recognition canceled: ${e.reason}`));
        }
      };

      recognizer.sessionStopped = (s, e) => {
        console.log("Session stopped.");
        recognizer.close();
        if (recognizedText.trim() !== "") {
          resolve(recognizedText.trim());
        } else {
          reject(new Error(`Speech Recognition session stopped without recognized speech`));
        }
      };

      recognizer.startContinuousRecognitionAsync();
    });
  } catch (error) {
    console.error("Error in transcription:", error);
    throw new Error(`Error in transcription: ${error}`);
  }
};

const transcribeWithSpeakerDiarization = async (fileContent, language) => {
  const speechConfig = SpeechConfig.fromSubscription(SPEECH_API_SUBSCRIPTION_KEY, SPEECH_API_SERVICE_REGION);
  speechConfig.speechRecognitionLanguage = language || "en-US";
  const audioConfig = AudioConfig.fromWavFileInput(fileContent);
  const conversationTranscriber = new ConversationTranscriber(speechConfig, audioConfig);
  return new Promise((resolve, reject) => {
    let transcript = [];
    conversationTranscriber.transcribed = (s, e) => {
      if (e.result.reason === ResultReason.RecognizedSpeech) {
        transcript.push({ speakerId: e.result.speakerId, text: e.result.text });
      }
    };
    conversationTranscriber.canceled = (s, e) => {
      if (e.reason === CancellationReason.Error) {
        reject(new Error(`Diarization Error: ${e.errorDetails}`));
      }
    };
    conversationTranscriber.sessionStopped = (s, e) => {
      conversationTranscriber.stopTranscribingAsync();
      resolve(transcript);
    };
    conversationTranscriber.startTranscribingAsync();
  });
};
// Pronunciation assessment function
const pronunciationAssessmentContinuousWithFile = (fileContent, referenceText, language) => {
  const speechConfig = SpeechConfig.fromSubscription(SPEECH_API_SUBSCRIPTION_KEY, SPEECH_API_SERVICE_REGION);
  speechConfig.speechRecognitionLanguage = language || "en-US"; 
  const audioConfig = AudioConfig.fromWavFileInput(fileContent);
  const pronunciationAssessmentConfig = new PronunciationAssessmentConfig(
    referenceText,
    PronunciationAssessmentGradingSystem.HundredMark,
    PronunciationAssessmentGranularity.Phoneme,
    true
  );
  pronunciationAssessmentConfig.enableProsodyAssessment = true;
  const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
  pronunciationAssessmentConfig.applyTo(recognizer);
  let result = {
    accuracyScore: 0,
    fluencyScore: 0,
    compScore: 0,
    prosodyScore: 0,  // Ensure default value
    pronScore: 0
  };
  recognizer.recognized = function (s, e) {
    const pronunciationResult = PronunciationAssessmentResult.fromResult(e.result);
    result.accuracyScore = pronunciationResult.accuracyScore || 0;
    result.fluencyScore = pronunciationResult.fluencyScore || 0;
    result.compScore = pronunciationResult.completenessScore || 0;
    result.prosodyScore = pronunciationResult.prosodyScore || 0; // Ensure prosodyScore is never NULL
    result.pronScore = pronunciationResult.pronunciationScore || 0;
  };
  recognizer.canceled = function (s, e) {
    if (e.reason === CancellationReason.Error) {
      console.log("(cancel) Reason: " + CancellationReason[e.reason] + ": " + e.errorDetails);
    }
    recognizer.stopContinuousRecognitionAsync();
  };
  recognizer.sessionStopped = function (s, e) {
    recognizer.stopContinuousRecognitionAsync();
    recognizer.close();
  };
  recognizer.startContinuousRecognitionAsync();
  return new Promise((resolve, reject) => {
    recognizer.sessionStopped = function (s, e) {
      recognizer.stopContinuousRecognitionAsync();
      recognizer.close();
      resolve(result);
    };
  });
};

// Audio transcription and pronunciation assessment
app.post("/startRecognition", async (req, res) => {
  let audioFiles = req.files.audioFile;
  const language = req.body.language || "en-US"; 
  console.log("Received audio files", audioFiles, "Selected Language:", language);
  if (!Array.isArray(audioFiles)) {
    audioFiles = [audioFiles];
  }
  if (!audioFiles || audioFiles.length === 0) {
    return res.status(400).json({ error: "No audio files uploaded." });
  }
  const containerName = "audiofilestorage";
  const transcriptionPromises = [];
  const pronunciationPromises = [];
  const diarizationPromises = []; 
  try {
    for (const audioFile of audioFiles) {
      const blobName = audioFile.name;
      const uploadsPath = path.join(__dirname, "Uploads", blobName);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const fileContent = audioFile.data;
      fs.writeFileSync(uploadsPath, fileContent);
      await blockBlobClient.uploadFile(uploadsPath);
      // Run Transcription & Pronunciation Assessment in Parallel
      const transcriptionPromise = transcribeAudioFile(fileContent, language);
      const pronunciationPromise = pronunciationAssessmentContinuousWithFile(fileContent, "It took me a long time to learn where he came from...", language);
      // Run Speaker Diarization Separately
      const diarizationPromise = transcribeWithSpeakerDiarization(fileContent, language);
      transcriptionPromises.push(transcriptionPromise);
      pronunciationPromises.push(pronunciationPromise);
      diarizationPromises.push(diarizationPromise);
    }
    // Wait for all transcriptions and pronunciation assessments to finish in parallel
    const [transcriptionResults, pronunciationResults, diarizationResults] = await Promise.all([
      Promise.all(transcriptionPromises),
      Promise.all(pronunciationPromises),
      Promise.all(diarizationPromises),
    ]);
    const documents = transcriptionResults.map((transcription, index) => ({
      id: audioFiles[index].name,
      text: transcription,
    }));
    const [sentimentAnalysisResult, piiResults] = await Promise.all([
      textAnalyticsClient.analyzeSentiment(documents, { includeOpinionMining: true }),
      textAnalyticsClient.recognizePiiEntities(documents),
    ]);
    const combinedResults = transcriptionResults.map((transcription, index) => ({
      fileName: audioFiles[index].name,
      transcription,
      sentiment: sentimentAnalysisResult[index].sentiment,
      confidenceScores: sentimentAnalysisResult[index].confidenceScores,
      redactedText: piiResults[index]?.redactedText || "",
      piiEntities: piiResults[index]?.entities?.map((entity) => ({
        text: entity.text,
        category: entity.category,
        confidenceScore: entity.confidenceScore || 0, 
      })) || [],
      pronunciationAssessment: {
        accuracyScore: pronunciationResults[index]?.accuracyScore || 0,
        fluencyScore: pronunciationResults[index]?.fluencyScore || 0,
        compScore: pronunciationResults[index]?.compScore || 0,
        prosodyScore: pronunciationResults[index]?.prosodyScore || 0, // Ensure this is not NULL
        pronScore: pronunciationResults[index]?.pronScore || 0
      },
      speakerDiarization: diarizationResults[index]
    }));
    
    console.log("combinedResults:", combinedResults);
    await Promise.all(combinedResults.map((result) =>
      dbOperation.insertOrUpdateAudioToText(result.fileName, result.transcription, result.sentiment, result.confidenceScores, result.pronunciationAssessment, result.speakerDiarization)
    ));
    res.status(200).json({ message: "Audio files uploaded and transcribed successfully", results: combinedResults });
  } catch (error) {
    console.error("Error during recognition:", error);
    res.status(500).json({ error: "Error during recognition" });
  }
});

// app.post("/Deepgram", async (req, res) => {
//   try {
//     const {
//       audioFilename,
//       transcript,
//       summary,
//       sentiment,
//       topics,
//       intents,
//       entities,
//     } = req.body;

//     const result = await dbOperation.insertDeepgramAudioAnalysis({
//       audioFilename,
//       transcript,
//       summarization: summary,
//       sentiment: sentiment?.sentiment || "neutral",
//       topics,
//       intents,
//       entities,
//     });

//     res.status(200).json({ message: "Data saved successfully" });
//   } catch (err) {
//     res.status(500).json({ error: "Error saving analysis data" });
//   }
// });


app.get("/languages", async (req, res) => {
  try {
    const response = await fetch(
      `${TRANSLATOR_TEXT_ENDPOINT}/languages?api-version=3.0`,
      {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": TRANSLATOR_DOCUMENT_KEY,
          "Ocp-Apim-Subscription-Region": SPEECH_API_SERVICE_REGION,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch supported languages: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const languages = data.translation;

    const languageArray = Object.keys(languages).map((code) => ({
      code,
      name: languages[code].name,
    }));
    res.status(200).json({ languages: languageArray });
  } catch (error) {
    console.error("Error fetching supported languages:", error);

    res.status(500).json({ error: "Internal server error" });
  }
});


app.post("/translate", async (req, res) => {
  console.log("Received POST request to /translate");

  // Extract text and targetLanguages from request body
  const { text, targetLanguages } = req.body;

  if (!text || !targetLanguages || targetLanguages.length === 0) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    // Call the translateText function to handle translation

    const translationResults = await translateText(
      text,
      targetLanguages,
      TRANSLATOR_DOCUMENT_KEY,
      TRANSLATOR_TEXT_ENDPOINT
    );
    console.log("translationResults", translationResults);
    res.json({ translationResults });
  } catch (error) {
    console.error("Error in /translate endpoint:", error);
    res.status(500).json({ error: "Failed to translate text" });
  }
});

async function performSummarization(text) {
  console.log("== Extractive Summarization Sample ==");

  const client = new TextAnalysisClient(
    LANGUAGE_ENDPOINT,
    new AzureKeyCredential(LANGUAGE_KEY)
  );
  const actions = [
    {
      kind: "ExtractiveSummarization",
      maxSentenceCount: 2,
    },
  ];
  const poller = await client.beginAnalyzeBatch(actions, [text], "en");

  const results = await poller.pollUntilDone();

  let summaries = [];
  for await (const actionResult of results) {
    if (actionResult.kind === "ExtractiveSummarization") {
      for (const result of actionResult.results) {
        if (!result.error) {
          summaries.push(
            result.sentences.map((sentence) => sentence.text).join("\n")
          );
        }
      }
    }
  }

  return summaries;
}
// Endpoint to receive text from client and trigger summarization
app.post("/summarize", async (req, res) => {
  const { speechText } = req.body;

  try {
    const summaries = await performSummarization(speechText);
    console.log("summaries:", summaries);
    res.status(200).json({ summaries });
  } catch (error) {
    console.error("Summarization error:", error);
    res.status(500).json({ error: "Error occurred during summarization." });
  }
});
// text to speech
app.post("/text-to-speech", async (req, res) => {
  const { text } = req.body;
  console.log("Received text:", text);

  try {
    // Perform sentiment analysis using Azure Text Analytics
    const sentimentResult = await textAnalyticsClient.analyzeSentiment([text]);

    // Extract the sentiment result
    const sentimentScore = sentimentResult[0].confidenceScores;
    const sentiment = sentimentResult[0].sentiment;

    const results = await textAnalyticsClient.recognizePiiEntities([text]);
    // Extract redacted text and PII entities
    const redactedText = results[0].redactedText;
    const piiEntities = results[0].entities.map((entity) => ({
      text: entity.text,
      category: entity.category,
    }));

    // Set up the speech synthesis configuration
    const speechConfig = SpeechConfig.fromSubscription(
      SPEECH_API_SUBSCRIPTION_KEY,
      SPEECH_API_SERVICE_REGION
    );
    speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";
    const synthesizer = new SpeechSynthesizer(speechConfig);

    // Convert text to speech
    synthesizer.speakTextAsync(
      text,
      (result) => {
        if (result) {
          const audioData = result.audioData;
          const audioBuffer = Buffer.from(audioData).toString("base64"); // Convert audio data to base64

          res.status(200).json({
            sentiment,
            confidenceScores: sentimentScore,
            redactedText,
            piiEntities,
            audioData: audioBuffer, // Send the base64-encoded audio data
          });
          console.log("Text-to-speech successful");
        } else {
          res.status(500).send("Error synthesizing speech");
        }
      },
      (error) => {
        console.error(error);
        res.status(500).send("Error synthesizing speech");
      }
    );

    console.log("Sentiment analysis result:", sentimentScore);
    console.log("PII information result:", piiEntities);
  } catch (error) {
    console.error("Error during text-to-speech:", error);
    res.status(500).send("Internal Server Error");
  }
});
// Route for PII recognition
app.post("/recognize-pii", async (req, res) => {
  const inputText = req.body.text;

  try {
    // Perform PII recognition
    const results = await textAnalyticsClient.recognizePiiEntities([inputText]);

    // Extract redacted text and PII entities
    const redactedText = results[0].redactedText;
    const piiEntities = results[0].entities.map((entity) => ({
      text: entity.text,
      category: entity.category,
    }));

    // Send the result back to the client
    res.json({ redactedText, piiEntities });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error processing PII recognition");
  }
});
// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.post("/api/speech-to-text", async (req, res) => {
  const { speechText } = req.body;
  console.log("Real time speech text:", speechText);

  try {
    await dbOperation.insertSpeechText(speechText);
    // Summarize the received speech text
    const summary = await summarizeText(speechText);
    console.log("summary", summary);
    res
      .status(200)
      .json({
        success: true,
        message: "Speech text saved and summarized successfully",
        summary,
      });
  } catch (error) {
    console.error("Error saving and summarizing speech text:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
// for python backend
// Define a route to handle sentiment analysis
app.post("/analyze-sentiment", async (req, res) => {
  try {
    const { documents } = req.body;

    // Analyze sentiment of the provided documents
    const result = await textAnalyticsClient.analyzeSentiment(documents, {
      includeOpinionMining: true,
    });
    console.log("sentiment anaysys result:", result);
    // Send the analyzed sentiment result to the client side

    // Insert sentiment analysis result into the database
    // await dbOperation.insertSentimentAnalysisResult(result);

    res.json(result);
    console.log("result:", result);
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    console.log("Error analyzing sentiment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Route for processing multiple files for PII recognition
// Function to upload file to Azure Blob Storage
async function uploadToBlobStorage(fileName, fileData) {
  console.log("filename", fileName);
  console.log("filedata", fileData);
  const containerName = "audiofilestorage"; // Specify your container name
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  const uploadResponse = await blockBlobClient.upload(
    fileData,
    fileData.length
  );
  console.log(`File ${fileName} uploaded to Azure Blob Storage.`);
}
app.post("/process-files-pii", async (req, res) => {
  let files = req.files.files; // Uploaded files
  console.log("files", files);

  // Check if audioFiles is not an array (single file upload scenario)
  if (!Array.isArray(files)) {
    files = [files]; // Convert to array for consistent handling
  }

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const results = [];
  try {
    // Process each file for PII recognition
    for (const file of files) {
      const inputText = file.data.toString("utf8");
      const recognitionResult = await textAnalyticsClient.recognizePiiEntities([
        inputText,
      ]);

      if (!recognitionResult || recognitionResult.length === 0) {
        throw new Error("No PII entities found");
      }

      const redactedText = recognitionResult[0].redactedText;
      const piiEntities = recognitionResult[0].entities.map((entity) => ({
        text: entity.text,
        category: entity.category,
      }));
      console.log("piiEntities", piiEntities);
      results.push({ fileName: file.name, redactedText, piiEntities });

      // Prepare processed data in a readable format
      const processedData = `File Name: ${
        file.name
      }\nRedacted Text: ${redactedText}\nPII Entities:\n${piiEntities
        .map((entity) => `- Text: ${entity.text}, Category: ${entity.category}`)
        .join("\n")}`;

      // Save the processed PII results to a file
      fs.writeFileSync(
        path.join(__dirname, "Uploads", file.name),
        processedData
      );

      // Upload the processed PII results to Azure Blob Storage
      await uploadToBlobStorage(file.name, processedData);
    }

    // Send aggregated results back to the client
    res.json(results);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Error processing files for PII");
  }
});
// Route for speech to text
// Add this route to your server.js
app.post("/api/save-summary", async (req, res) => {
  const { textContent, abstractSummary, extractSummary } = req.body;

  // Process the received data as needed, e.g., save to a database
  // For demonstration purposes, I'll just log the received data
  console.log("Received data:");
  console.log("Received textContent:", textContent);
  console.log("Abstract Summary:", abstractSummary);
  console.log("Extract Summary:", extractSummary);

  try {
    // Insert data into the database
    await dbOperation.insertSummaryData(
      textContent,
      extractSummary,
      abstractSummary
    );

    // Respond to the client
    res
      .status(200)
      .json({ message: "Summary data received and processed successfully." });
  } catch (error) {
    console.error("Error saving summary data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while saving summary data." });
  }
});

// google sign in

const { OAuth2Client } = require("google-auth-library");
const Client_id = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(Client_id);

const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: Client_id,
    });
    const payload = ticket.getPayload();
    console.log("Google Token Payload:", payload);
    return payload;
  } catch (error) {
    console.error("Error verifying token:", error);
    throw new Error("Invalid token");
  }
};

app.post("/google-login", async (req, res) => {
  try {
    const { token } = req.body;

    // Verify Google Token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: Client_id,
    });

    const { email, name } = ticket.getPayload();

    // Check if the email exists in the database
    const user = await dbOperation.findUserByEmail(email);

    if (!user) {
      return res
        .status(401)
        .json({ error: "Access denied: Email not registered." });
    }

    // Login successful
    res.json({ name, email });
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({ error: "Google Sign-In failed" });
  }
});

// Verify OTP

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log(`Generated OTP: ${otp}`);

    // Save OTP to Database
    const pool = await getDbConnection();
    await pool
      .request()
      .input("email", sql.VarChar, email)
      .input("otp", sql.Int, otp)
      .query("INSERT INTO OTPTable (email, otp) VALUES (@email, @otp)");

    console.log(`OTP ${otp} saved for ${email}`);

    return res.json({
      success: true,
      message: "OTP sent and saved successfully",
    });
  } catch (error) {
    console.error("Error saving OTP:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/verify-otp", (req, res) => {
  const { token, otp } = req.body;

  try {
    // Decode JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.otp.toString() === otp) {
      return res.json({ success: true, message: "OTP verified successfully!" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
});
app.get('/databases', async (req, res) => {
  try {
    const databases = await dbOperation.getDatabases();
    res.json(databases);
  } catch (err) {
    console.error("Error fetching databases:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/tables', async (req, res) => {
  const { database } = req.query;
  try {
    const tables = await dbOperation.getTables(database);
    res.json(tables);
  } catch (err) {
    console.error("Error fetching tables:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/tableData', async (req, res) => {
  const { database, table } = req.query;
  try {
    const tableData = await dbOperation.getTableData(database, table);
    res.json(tableData);
  } catch (err) {
    console.error("Error fetching table data:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/create-database', async (req, res) => {
  const { dbName } = req.body;
  try {
    const result = await dbOperation.createDatabase(dbName);
    res.json(result);
  } catch (err) {
    console.error("Error creating database:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/create-table", async (req, res) => {
  const { tableName, columns, rows, databaseName } = req.body;

  // Log to check data format
  console.log("Received columns:", columns);
  console.log("Received rows:", rows);

  try {
    const message = await dbOperation.createTable(databaseName, tableName, columns, rows);
    res.json({ message });
  } catch (err) {
    console.error("Error creating table:", err.message);
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});