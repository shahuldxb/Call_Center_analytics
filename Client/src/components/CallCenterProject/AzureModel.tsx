import React, { useState, ChangeEvent } from "react";
import { FaSpinner } from "react-icons/fa";
const BASE_URL: string = import.meta.env.VITE_APP_API_URL as string;
function AzureModel() {
  interface TopicResult {
    topic: string;
    description?: string;
  }
  interface TopicModel {
    [fileName: string]: TopicResult[];
  }
  interface TopicModelResponse {
    results?: {
      fileName: string;
      topic?: string;
      description?: string;
    }[];
  }
  interface ProcessedResults {
    [fileName: string]: {
      fileName: string;
      transcription?: string;
      extractSummary?: string;
      abstractSummary?: string;
    };
  }
  interface AudioStatus {
    [key: string]: {
      isPlaying: boolean;
      audio: HTMLAudioElement;
    };
  }
  interface StatusUpdates {
    [key: string]: string; // Status updates for each file (key is the file name, value is the status)
  }
  interface TranscriptionResult {
    fileName: string;
    transcription?: string;
    diarizedTranscription?: string;
    speakerDiarization?: Segment[]; // Adjust the type of speaker diarization as per your data structure
  }
  interface EmotionResults {
    [fileName: string]: {
      emotion: string;
      confidence: number;
    };
  }
  interface Segment {
    text: string; // Assuming segment has a 'text' property that is a string
  }
  interface Sentiment {
    positive?: number;
    neutral?: number;
    negative?: number;
  }
  interface PronunciationAssessment {
    accuracyScore?: string;
    fluencyScore?: string;
    compScore?: string;
    prosodyScore?: string;
    pronScore?: string;
  }
  interface PiiEntity {
    category: string;
    text: string;
    confidenceScore?: number;
  }
  interface Transcriptions {
    [fileName: string]: {
      sentiment?: string;
      confidenceScores?: Sentiment;
      pronunciationAssessment?: PronunciationAssessment;
      abstractSummary?: string;
      extractSummary?: string;
      piiEntities?: PiiEntity[];
      transcription?: string;
      diarizedTranscription?: string;
    };
  }
  interface SummaryResponse {
    extract_summaries?: string[];
    abstract_summaries?: string[];
  }
  const filesPerPage: number = 10;

  // React State with Types
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [transcriptions, setTranscriptions] = useState<Transcriptions>({});
  const [processingStatus, setProcessingStatus] = useState<StatusUpdates>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [emotionResults, setEmotionResults] = useState<EmotionResults>({});
  const [topicModel, setTopicModel] = useState<TopicModel>({});
  const [viewMode, setViewMode] = useState<string>("transcription");
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({});
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en-US");
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const indexOfLastFile = currentPage * filesPerPage;
  const indexOfFirstFile = indexOfLastFile - filesPerPage;
  const currentFiles = selectedFiles.slice(indexOfFirstFile, indexOfLastFile);
  const totalPages = Math.ceil(selectedFiles.length / filesPerPage);
  const pageNumbers = [];

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(event.target.value);
  };
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray: File[] = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      // Initialize audio status for each file
      const initialAudioStatus: AudioStatus = {};
      filesArray.forEach((file: File) => {
        // Ensure file is of type File
        const audio = new Audio(URL.createObjectURL(file));

        initialAudioStatus[file.name] = {
          isPlaying: false,
          audio, // Assign the audio element to the state
        };
      });
      setAudioStatus(initialAudioStatus);
      setIsAudioLoaded(true);
    }
  };
  const togglePlayPause = (fileName: string) => {
    const audioData = audioStatus[fileName];

    if (audioData.isPlaying) {
      audioData.audio.pause();
    } else {
      // Add 'ended' event listener to reset isPlaying when audio ends
      audioData.audio.play();
      audioData.audio.onended = () => {
        setAudioStatus((prevStatus) => ({
          ...prevStatus,
          [fileName]: { ...prevStatus[fileName], isPlaying: false },
        }));
      };
    }

    setAudioStatus((prevStatus) => ({
      ...prevStatus,
      [fileName]: { ...audioData, isPlaying: !audioData.isPlaying },
    }));
  };
  const handleFileUpload = async (): Promise<void> => {
    // Start the loading state
    setLoading(true);
    const statusUpdates: StatusUpdates = {};
    const results: { [key: string]: TranscriptionResult } = {};
    const emotionResults: EmotionResults = {};

    selectedFiles.forEach((file: File) => {
      statusUpdates[file.name] = "loading";
    });
    setProcessingStatus({ ...statusUpdates });
    // Function to process a single file
    const processFile = async (file: File): Promise<void> => {
      const formData = new FormData();

      formData.append("audioFile", file);
      formData.append("language", selectedLanguage || "auto"); // Pass "auto" if no language is selected

      try {
        // Parallel API requests
        const [recognitionResponse, predictResponse] = await Promise.all([
          fetch(`${BASE_URL}/startRecognition`, {
            method: "POST",
            body: formData,
            headers: { Connection: "keep-alive" },
          }),
          fetch(`http://127.0.0.1:5000/predict`, {
            method: "POST",
            body: formData,
            headers: { Connection: "keep-alive" },
          }),
        ]);
        console.log("response",recognitionResponse)
        if (!recognitionResponse.ok) {
          throw new Error(
            `Recognition API error: ${recognitionResponse.status}`
          );
        }
        if (!predictResponse.ok) {
          throw new Error(`Prediction API error: ${predictResponse.status}`);
        }

        // Check if responses have valid JSON content
        const recognitionText = await recognitionResponse.text();
        const predictText = await predictResponse.text();

        const recognitionResult = recognitionText
          ? JSON.parse(recognitionText)
          : {};
        const predictResult = predictText ? JSON.parse(predictText) : {};

        if (recognitionResult.results?.length > 0) {
          const fileData: TranscriptionResult = recognitionResult.results[0];

          if (fileData.speakerDiarization) {
            let currentGuest = "Guest 1";
            fileData.diarizedTranscription = fileData.speakerDiarization
              .map((segment: Segment) => {
                const text = `${currentGuest}: ${segment.text}`;
                currentGuest =
                  currentGuest === "Guest 1" ? "Guest 2" : "Guest 1";
                return text;
              })
              .join("\n");
          }

          results[fileData.fileName] = fileData;
          statusUpdates[fileData.fileName] = "done";

          await processTopicModeling({ [fileData.fileName]: fileData });
        } else {
          statusUpdates[file.name] = "error";
        }

        if (predictResult.emotion) {
          emotionResults[file.name] = {
            emotion: predictResult.emotion,
            confidence: predictResult.confidence,
          };
        }
      } catch (error) {
        console.error(`Error processing file: ${file.name}`, error);
        statusUpdates[file.name] = "error";
      }

      setProcessingStatus((prev) => ({ ...prev, ...statusUpdates }));
      setTranscriptions((prev) => ({ ...prev, ...results }));
      setEmotionResults((prev) => ({ ...prev, ...emotionResults }));
    };

    // Process all selected files in parallel
    await Promise.all(selectedFiles.map((file: File) => processFile(file)));

    // Stop loading and show confetti
    setLoading(false);
    setIsProcessed(true);
  };
  const processTopicModeling = async (
    processedResults: ProcessedResults
  ): Promise<void> => {
    setLoading(true); // Show loader
    try {
      const textDocuments = Object.values(processedResults)
        .filter((fileData) => fileData?.transcription)
        .map((fileData) => ({
          fileName: fileData.fileName,
          transcription: fileData.transcription,
        }));
      if (textDocuments.length === 0) {
        console.error("No valid text documents for topic modeling.");
        setLoading(false);
        return;
      }
      console.log(`Sending ${textDocuments.length} file(s) to topic modeling`);
      const response = await fetch("http://127.0.0.1:5000/topic-modeling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textDocuments }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const result: TopicModelResponse = await response.json();
      console.log("Topic modeling results:", result);
      if (result?.results) {
        const newTopicResults: TopicModel = {};

        // Process each result item
        result.results.forEach((item) => {
          if (item.fileName) {
            // Handle the case where there is a fileName
            newTopicResults[item.fileName] = [
              {
                topic: item.topic || "Unknown Topic",
                description: item.description || "",
              },
            ];
          } else {
            console.error("Unexpected result format:", item);
          }
        });
        setTopicModel((prev) => ({ ...prev, ...newTopicResults }));
      } else {
        console.error("No topic results received from server.");
      }
    } catch (error) {
      console.error("Error in topic modeling:", error);
    }
    setLoading(false); // Hide loader
  };
  const handleOutputClick = () => {
    try {
      setViewMode("transcription");
    } catch (error) {
      alert("transcription data not available");
    }
  };
  const handleSentimentClick = () => {
    try {
      setViewMode("sentiment");
    } catch (error) {
      alert("sentiment data not available");
    }
  };
  const handleClickPronunciation = () => {
    try {
      setViewMode("PronunciationAssessment");
    } catch (error) {
      alert("Pronunciation data not available");
    }
  };
  const handleClickPIIentity = () => {
    try {
      setViewMode("PII");
    } catch (error) {
      alert("Pronunciation data not available");
    }
  };
  const handleSummaryClick = async () => {
    setViewMode("summary"); // Set the view mode to 'summary'
    setLoading(true); // Show the spinner

    const summaries: {
      [fileName: string]: { extractSummary: string; abstractSummary: string };
    } = {};
    // Filter out files without transcriptions
    const validFiles = selectedFiles.filter(
      (file) => transcriptions[file.name]?.transcription
    );
    // Use Promise.all to process all files in parallel
    const summaryPromises = validFiles.map(async (file) => {
      const transcriptionText = transcriptions[file.name]?.transcription;

      try {
        const response = await fetch(
          "http://127.0.0.1:5000/api/generate-summary",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text_documents: [transcriptionText] }),
          }
        );

        const result: SummaryResponse = await response.json();

        summaries[file.name] = {
          extractSummary:
            result.extract_summaries?.[0] || "[No extract summary available]",
          abstractSummary:
            result.abstract_summaries?.[0] || "[No abstract summary available]",
        };
      } catch (error) {
        console.error(`Error generating summary for file: ${file.name}`, error);
      }
    });

    await Promise.all(summaryPromises); // Wait for all summaries to complete

    // Update state in one batch for better performance
    setTranscriptions((prevState) => {
      const updatedTranscriptions = { ...prevState };
      for (const fileName in summaries) {
        if (updatedTranscriptions[fileName]) {
          updatedTranscriptions[fileName].extractSummary =
            summaries[fileName].extractSummary;
          updatedTranscriptions[fileName].abstractSummary =
            summaries[fileName].abstractSummary;
        }
      }
      return updatedTranscriptions;
    });

    setLoading(false);
  };
  const handleEmotionalToneClick = async () => {
    try {
      setViewMode("DetectEmotionalTone");
    } catch (error) {
      alert("sentiment data not available");
    }
  };
  const handleClickTopicModel = async () => {
    setViewMode("topicModel");
    setLoading(true);

    const validFiles = selectedFiles.filter(
      (file) => transcriptions[file.name]?.transcription
    );
    if (validFiles.length === 0) {
      setLoading(false);
      return;
    }

    // Prepare processed results like summarization
    const processedResults: ProcessedResults = {};
    validFiles.forEach((file) => {
      processedResults[file.name] = {
        fileName: file.name,
        transcription: transcriptions[file.name]?.transcription || "",
      };
    });

    // Call topic modeling function
    await processTopicModeling(processedResults);

    setLoading(false);
  };
  const handleClick = (pageNumber: number): void => setCurrentPage(pageNumber);
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }
  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      Person: "#26C281",
      PersonType: "#BF55EC",
      DateTime: "#f36a5a",
      Address: "#FFA500",
      PhoneNumber: "#3598dc",
    };
    return colors[category] || "#3598dc";
  };
  return (
    <>
      <div className="card mt-2 ">
        <div className="card-body flex justify-between">
          <input
            className="file-input w-72"
            onChange={handleFileChange}
            type="file"
            multiple
          />
          <select
            className="select w-72"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            name="select"
          >
            <option value="en-US">English (US)</option>
            <option value="fr-FR">French</option>
            <option value="es-ES">Spanish</option>
            <option value="ta-IN">Tamil</option>
            <option value="hi-IN">Hindi</option>
            <option value="ar-SA">Arabic</option>
          </select>
          <button className="btn btn-primary" onClick={handleFileUpload}>
            Process
          </button>
        </div>
      </div>
      <div className="mt-5 card ">
        <div className="card-body space-x-16 flex justify-center">
          <button
            className={`btn ${
              isAudioLoaded ? "btn-primary" : "btn-primary  btn-outline"
            }`}
          >
            {isAudioLoaded ? "Loaded Audio" : "Load Data"}
          </button>

          <button
            className={`btn ${
              loading
                ? "btn-info"
                : isProcessed
                ? "btn-info"
                : "btn-info btn-outline"
            }`}
          >
            {loading ? "Processing..." : isProcessed ? "Processed" : "Process"}
          </button>
          <button
            className={`btn ${
              isProcessed ? "btn-success" : "btn-success btn-outline"
            }`}
          >
            {isProcessed ? "Completed" : "Waiting"}
          </button>
        </div>
      </div>

      <div className="card  mt-5 h-[600px]  card-table  ">
        <div className="tabs mb-3 m-4 text-lg gap-10 mr-5" data-tabs="true">
          <button
            className="tab active"
            data-tab-toggle="#tab_1_1"
            onClick={handleOutputClick}
          >
            Transcription
          </button>
          <button
            className="tab"
            data-tab-toggle="#tab_1_2"
            onClick={handleSummaryClick}
          >
            Summarization
          </button>
          <button
            className="tab"
            data-tab-toggle="#tab_1_3"
            onClick={handleSentimentClick}
          >
            Sentiment
          </button>
          <button
            className="tab "
            data-tab-toggle="#tab_1_1"
            onClick={handleEmotionalToneClick}
          >
            Emotional Tone
          </button>
          <button
            className="tab"
            data-tab-toggle="#tab_1_2"
            onClick={handleClickPronunciation}
          >
            Pronunciation
          </button>
          <button
            className="tab"
            data-tab-toggle="#tab_1_3"
            onClick={handleClickPIIentity}
          >
            Entity Information
          </button>
          <button
            className="tab"
            data-tab-toggle="#tab_1_3"
            onClick={handleClickTopicModel}
          >
            Topic Modeling
          </button>
        </div>
        <div className="h-[450px]">
          <div className="card-table">
            <div className="h-[450px] ">
              <table className="table align-middle text-gray-700 font-medium text-sm w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-4 w-1/2">Current Audio File</th>
                    <th className="p-4 w-1/2">
                      <span>
                        {viewMode === "sentiment"
                          ? "Sentiment"
                          : viewMode === "topicModel"
                          ? "Topic Model"
                          : viewMode === "transcription"
                          ? "Transcription"
                          : viewMode === "PII"
                          ? "Entity Data"
                          : viewMode === "summary"
                          ? "Summary"
                          : viewMode === "DetectEmotionalTone"
                          ? "Emotion Detection"
                          : viewMode === "PronunciationAssessment"
                          ? "PronunciationAssessment"
                          : "Other"}
                      </span>
                    </th>
                  </tr>
                </thead>
              </table>
              {/* Wrapping tbody with a div to handle scrolling */}
              <div className="scrollable-y scrollbar-hide max-h-[400px]">
                <table className="table align-middle text-gray-700 font-medium text-sm w-full">
                  <tbody>
                    {currentFiles.length > 0 ? (
                      currentFiles.map((file, index) => (
                        <tr key={index}>
                          <td className="p-4 w-1/2">
                            <div className="border  border-gray-100 px-4 py-4 mb-2 ml-2 my-2 hover:bg-white hover:dark:bg-[#111217] hover:shadow-md transition transform hover:-translate-y-1 flex justify-between items-center ">
                              <div className="flex items-center">
                                <span className="mr-2">
                                  {indexOfFirstFile + index + 1}.
                                </span>
                                <span className="mr-4">{file.name}</span>
                              </div>

                              {/* Processing Status Icons */}
                              <div className="flex items-center justify-between w-60">
                                {/* Play/Pause Button */}
                                <button
                                  onClick={() => togglePlayPause(file.name)}
                                  className="text-blue-500 hover:text-blue-600 ml-2"
                                >
                                  {audioStatus[file.name]?.isPlaying ? (
                                    <span className="svg-icon svg-icon-primary svg-icon-2x">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24px"
                                        height="24px"
                                        viewBox="0 0 24 24"
                                        version="1.1"
                                      >
                                        <title>
                                          Stockholm-icons / Media / Pause
                                        </title>
                                        <desc>Created with Sketch.</desc>
                                        <defs />
                                        <g
                                          stroke="none"
                                          stroke-width="1"
                                          fill="none"
                                          fill-rule="evenodd"
                                        >
                                          <rect
                                            x="0"
                                            y="0"
                                            width="24"
                                            height="24"
                                          />
                                          <path
                                            d="M8,6 L10,6 C10.5522847,6 11,6.44771525 11,7 L11,17 C11,17.5522847 10.5522847,18 10,18 L8,18 C7.44771525,18 7,17.5522847 7,17 L7,7 C7,6.44771525 7.44771525,6 8,6 Z M14,6 L16,6 C16.5522847,6 17,6.44771525 17,7 L17,17 C17,17.5522847 16.5522847,18 16,18 L14,18 C13.4477153,18 13,17.5522847 13,17 L13,7 C13,6.44771525 13.4477153,6 14,6 Z"
                                            fill="#3391F2"
                                          />
                                        </g>
                                      </svg>
                                    </span>
                                  ) : (
                                    <span className="svg-icon svg-icon-primary svg-icon-2x">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24px"
                                        height="24px"
                                        viewBox="0 0 24 24"
                                        version="1.1"
                                      >
                                        <title>
                                          Stockholm-icons / Media / Play
                                        </title>
                                        <desc>Created with Sketch.</desc>
                                        <defs />
                                        <g
                                          stroke="none"
                                          stroke-width="1"
                                          fill="none"
                                          fill-rule="evenodd"
                                        >
                                          <rect
                                            x="0"
                                            y="0"
                                            width="24"
                                            height="24"
                                          />
                                          <path
                                            d="M9.82866499,18.2771971 L16.5693679,12.3976203 C16.7774696,12.2161036 16.7990211,11.9002555 16.6175044,11.6921539 C16.6029128,11.6754252 16.5872233,11.6596867 16.5705402,11.6450431 L9.82983723,5.72838979 C9.62230202,5.54622572 9.30638833,5.56679309 9.12422426,5.7743283 C9.04415337,5.86555116 9,5.98278612 9,6.10416552 L9,17.9003957 C9,18.1765381 9.22385763,18.4003957 9.5,18.4003957 C9.62084305,18.4003957 9.73759731,18.3566309 9.82866499,18.2771971 Z"
                                            fill="#3391F2"
                                          />
                                        </g>
                                      </svg>
                                    </span>
                                  )}
                                </button>
                                {processingStatus[file.name] === "loading" && (
                                  <FaSpinner className="animate-spin text-gray-500 mr-2" />
                                )}
                                {processingStatus[file.name] === "done" && (
                                  <span className="svg-icon svg-icon-primary svg-icon-2x">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="40px"
                                      height="24px"
                                      viewBox="0 0 24 24"
                                      version="1.1"
                                    >
                                      <title>
                                        Stockholm-icons / Navigation / Check
                                      </title>
                                      <desc>Created with Sketch.</desc>
                                      <defs />
                                      <g
                                        stroke="none"
                                        stroke-width="1"
                                        fill="none"
                                        fill-rule="evenodd"
                                      >
                                        <polygon points="0 0 24 0 24 24 0 24" />
                                        <path
                                          d="M6.26193932,17.6476484 C5.90425297,18.0684559 5.27315905,18.1196257 4.85235158,17.7619393 C4.43154411,17.404253 4.38037434,16.773159 4.73806068,16.3523516 L13.2380607,6.35235158 C13.6013618,5.92493855 14.2451015,5.87991302 14.6643638,6.25259068 L19.1643638,10.2525907 C19.5771466,10.6195087 19.6143273,11.2515811 19.2474093,11.6643638 C18.8804913,12.0771466 18.2484189,12.1143273 17.8356362,11.7474093 L14.0997854,8.42665306 L6.26193932,17.6476484 Z"
                                          fill="#26C281"
                                          fill-rule="nonzero"
                                          transform="translate(11.999995, 12.000002) rotate(-180.000000) translate(-11.999995, -12.000002) "
                                        />
                                      </g>
                                    </svg>
                                  </span>
                                )}
                                {processingStatus[file.name] === "error" && (
                                  <span className="text-red-500">Error</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 w-1/2">
                            <div className="border border-gray-100 px-4 py-2 mb-2 mr-2 my-2 card hover:shadow-md  transition transform hover:-translate-y-1">
                              {viewMode === "transcription" ? (
                                transcriptions[file.name]?.diarizedTranscription
                                  ?.split("\n")
                                  .map((line, index) => (
                                    <div key={index} className="mb-1">
                                      {line}
                                    </div>
                                  )) || "[No transcription available yet]"
                              ) : viewMode === "sentiment" ? (
                                transcriptions[file.name]?.sentiment &&
                                transcriptions[file.name]?.confidenceScores ? (
                                  <div className="h-full flex flex-col items-center justify-center">
                                    <p>
                                      Sentiment:{" "}
                                      {transcriptions[file.name].sentiment}
                                    </p>{" "}
                                    <br />
                                    <p>
                                      Confidence Scores: Positive -{" "}
                                      {
                                        transcriptions[file.name]
                                          .confidenceScores.positive
                                      }
                                      , Neutral -{" "}
                                      {
                                        transcriptions[file.name]
                                          .confidenceScores.neutral
                                      }
                                      , Negative -{" "}
                                      {
                                        transcriptions[file.name]
                                          .confidenceScores.negative
                                      }
                                    </p>
                                  </div>
                                ) : (
                                  "[No sentiment data available yet]"
                                )
                              ) : viewMode === "PronunciationAssessment" ? (
                                transcriptions[file.name]
                                  ?.pronunciationAssessment ? (
                                  <div className="text-center flex gap-5 items-center h-full text-blue-600 ">
                                    <p className="">
                                      {" "}
                                      accuracyScore{" "}
                                      {
                                        transcriptions[file.name]
                                          .pronunciationAssessment.accuracyScore
                                      }
                                    </p>
                                    <p>
                                      {" "}
                                      fluencyScore{" "}
                                      {
                                        transcriptions[file.name]
                                          .pronunciationAssessment.fluencyScore
                                      }
                                    </p>
                                    <p>
                                      {" "}
                                      compScore{" "}
                                      {
                                        transcriptions[file.name]
                                          .pronunciationAssessment.compScore
                                      }
                                    </p>
                                    <p>
                                      {" "}
                                      prosodyScore{" "}
                                      {
                                        transcriptions[file.name]
                                          .pronunciationAssessment.prosodyScore
                                      }
                                    </p>
                                    <p className="">
                                      {" "}
                                      pronScore{" "}
                                      {
                                        transcriptions[file.name]
                                          .pronunciationAssessment.pronScore
                                      }
                                    </p>
                                  </div>
                                ) : (
                                  "[No pronunciation available yet]"
                                )
                              ) : viewMode === "summary" ? (
                                <div className="h-full flex flex-col items-center">
                                  {loading ? (
                                    // Display spinner while processing
                                    <div className="flex justify-center items-center">
                                      <FaSpinner className="animate-spin text-gray-500 mr-2" />

                                      <p className="ml-2">
                                        Summarizing, please wait...
                                      </p>
                                    </div>
                                  ) : (
                                    // Show summaries once summarization is complete
                                    <>
                                      <h1 className="mt-5 text-gray-950 dark:text-white">
                                        Extract Summary{" "}
                                      </h1>
                                      <p className="m-2 text-gray-800">
                                        {transcriptions[file.name]
                                          ?.extractSummary ||
                                          "[No extract summary available]"}
                                      </p>
                                      <h1 className="mt-10 mb-2 text-gray-950 dark:text-white">
                                        Abstract Summary{" "}
                                      </h1>
                                      <p className="ml-2 text-gray-600">
                                        {transcriptions[file.name]
                                          ?.abstractSummary ||
                                          "[No abstract summary available]"}
                                      </p>
                                    </>
                                  )}
                                </div>
                              ) : viewMode === "DetectEmotionalTone" ? (
                                <div>
                                  {/* <p>{file.name}</p> */}
                                  {emotionResults[file.name] ? (
                                    <div className="flex flex-col items-center justify-center">
                                      <p>
                                        {" "}
                                        <strong>Emotion:</strong>{" "}
                                        {emotionResults[file.name].emotion}
                                      </p>
                                      <p>
                                        {" "}
                                        <strong>Confidence:</strong>{" "}
                                        {emotionResults[file.name].confidence}
                                      </p>
                                    </div>
                                  ) : (
                                    <p>No emotion data available</p>
                                  )}
                                </div>
                              ) : viewMode === "PII" ? (
                                <div className=" grid gap-6 p-6 xl:grid-cols-2 sm:grid-cols-1">
                                  {Array.isArray(
                                    transcriptions[file.name]?.piiEntities
                                  ) &&
                                  transcriptions[file.name].piiEntities.length >
                                    0 ? (
                                    transcriptions[file.name].piiEntities.map(
                                      (entity, index) => (
                                        <div
                                          key={index}
                                          className="bg-white  card shadow-lg rounded-lg p-5 border relative"
                                        >
                                          {/* Category with a bottom border */}
                                          <h3
                                            className="text-md  text-gray-900 dark:text-gray-950 pb-2 border-b-2"
                                            style={{
                                              borderBottomColor:
                                                getCategoryColor(
                                                  entity.category
                                                ),
                                            }}
                                          >
                                            {entity.category}
                                          </h3>
                                          {/* Entity Details */}
                                          <p className="text-sm  text-gray-600 mt-2">
                                            Entity value:{" "}
                                            <span className="text-sm text-gray-950">
                                              {entity.text}
                                            </span>
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            Confidence:{" "}
                                            <span className="text-sm text-gray-950">
                                              {entity.confidenceScore
                                                ? (
                                                    entity.confidenceScore * 100
                                                  ).toFixed(2) + "%"
                                                : "N/A"}
                                            </span>
                                          </p>
                                        </div>
                                      )
                                    )
                                  ) : (
                                    <p className="col-span-3 text-center text-gray-600 dark:text-gray-300">
                                      No PII Entities Found
                                    </p>
                                  )}
                                </div>
                              ) : (
                                viewMode === "topicModel" && (
                                  <>
                                    <p className=" text-blue-600 flex items-center justify-center mb-2">
                                      Results for {file.name}:
                                    </p>
                                    {Array.isArray(topicModel[file.name]) &&
                                    topicModel[file.name].length > 0 ? (
                                      topicModel[file.name].map(
                                        (topicItem, topicIndex) => (
                                          <div
                                            key={topicIndex}
                                            className="mb-4 p-3 border rounded-lg"
                                          >
                                            <h1 className="text-md text-center text-gray-900 ">
                                              {topicItem.topic ||
                                                "Unknown Topic"}
                                            </h1>
                                            {topicItem.description && (
                                              <p className="mt-2 ">
                                                {topicItem.description}
                                              </p>
                                            )}
                                          </div>
                                        )
                                      )
                                    ) : (
                                      <p className="text-center">
                                        No topics available for this file.
                                      </p>
                                    )}
                                  </>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-4" colSpan={2}>
                          No audio files available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-2 text-gray-600 text-2sm font-medium flex justify-between items-center ">
              {selectedFiles.length > filesPerPage && (
                <div className="pagination flex justify-end w-full">
                  {pageNumbers.map((number) => (
                    <button
                      key={number}
                      onClick={() => handleClick(number)}
                      className="btn"
                    >
                      {number}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default AzureModel;
