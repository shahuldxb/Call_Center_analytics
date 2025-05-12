import React, { useRef, useState, useEffect } from "react";
function Deepgram() {
  type AudioStatus = {
    [fileName: string]: {
      isPlaying: boolean;
    };
  };
  type SubTopic = {
    topic: string;
    confidence_score: number;
  };
  type TopicItem = {
    text: string;
    topics?: SubTopic[];
  };
  type Intents = {
    segments: {
      intents: {
        intent: string;
        confidence_score: number;
      }[];
    }[];
  };
  type Sentiment = {
    sentiment: string;
    sentiment_score: number;
  };
  type ResultItem = {
    filename: string;
    results: {
      transcript?: string;
      summary?: string;
      sentiment?: Sentiment;
      topics?: TopicItem[];
      intents?: Intents;
      entities?: Entity[];
    };
  };
  type Entity = {
    start_word: number;
    end_word: number;
    label: string;
    value: string;
    confidence: number;
  };
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState<File[]>([]);
  const [selectedSection, setSelectedSection] = useState("transcript");
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({});
  const [audioSrc, setAudioSrc] = useState<{ [fileName: string]: string }>({});
  const audioRefs = useRef<{ [fileName: string]: HTMLAudioElement | null }>({});
  const [loading, setLoading] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<ResultItem[]>([]);
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };
  useEffect(() => {
    return () => {
      Object.values(audioSrc).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [audioSrc]);
  const togglePlayPause = async (fileName: string) => {
    const currentAudio = audioRefs.current[fileName];
    if (currentAudio) {
      if (audioStatus[fileName]?.isPlaying) {
        currentAudio.pause();
        setAudioStatus((prev) => ({
          ...prev,
          [fileName]: { isPlaying: false },
        }));
      } else {
        try {
          await currentAudio.play();
          setAudioStatus((prev) => ({
            ...prev,
            [fileName]: { isPlaying: true },
          }));
        } catch (err) {
          console.error("Audio play failed:", err);
        }
      }
    }
  };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const selected = Array.from(files);
    setSelectedFile(selected);

    const newSrcs: { [fileName: string]: string } = {};
    selected.forEach((file) => {
      const url = URL.createObjectURL(file);
      newSrcs[file.name] = url;
    });

    setAudioSrc(newSrcs);
    // Cleanup on component unmount or file change
    return () => {
      Object.values(newSrcs).forEach((url) => URL.revokeObjectURL(url));
    };
  };

  const handleProcessClick = async () => {
  if (selectedFile.length === 0) {
    alert("Please select one or more audio files.");
    return;
  }

  setLoading(true);
  setTranscriptionResult([]); // clear old results

  for (const file of selectedFile) {
    const formData = new FormData();
    formData.append("audio", file); // send one file at a time

    try {
      const response = await fetch("http://localhost:5000/audio", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        // Append result for this file
        setTranscriptionResult((prev) => [...prev, ...result.results]);
      } else {
        console.error("❌ Error:", result.error);
        alert(`Error processing ${file.name}: ${result.error}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(`Upload failed for ${file.name}. Check server console.`);
    }
  }

  setLoading(false);
};

  return (
    <>
      <div className="card">
        <div className="card-body p-4">
          <div className="d-flex flex-column align-items-center border border-dashed border-gray-400 rounded px-10 py-15 text-center">
            {selectedFile.length === 0 ? (
              <div
                className="cursor-pointer d-flex flex-column align-items-center justify-content-center"
                onClick={handleBrowseClick}
              >
                <div className="flex justify-center mt-5">
                  <span className="svg-icon svg-icon-primary svg-icon-2x">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="54px"
                      height="54px"
                      viewBox="0 0 24 24"
                      version="1.1"
                    >
                      <title>Stockholm-icons / Files / Cloud-upload</title>
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
                          d="M5.74714567,13.0425758 C4.09410362,11.9740356 3,10.1147886 3,8 C3,4.6862915 5.6862915,2 9,2 C11.7957591,2 14.1449096,3.91215918 14.8109738,6.5 L17.25,6.5 C19.3210678,6.5 21,8.17893219 21,10.25 C21,12.3210678 19.3210678,14 17.25,14 L8.25,14 C7.28817895,14 6.41093178,13.6378962 5.74714567,13.0425758 Z"
                          fill="#C2E0FF"
                          opacity="0.3"
                        />
                        <path
                          d="M11.1288761,15.7336977 L11.1288761,17.6901712 L9.12120481,17.6901712 C8.84506244,17.6901712 8.62120481,17.9140288 8.62120481,18.1901712 L8.62120481,19.2134699 C8.62120481,19.4896123 8.84506244,19.7134699 9.12120481,19.7134699 L11.1288761,19.7134699 L11.1288761,21.6699434 C11.1288761,21.9460858 11.3527337,22.1699434 11.6288761,22.1699434 C11.7471877,22.1699434 11.8616664,22.1279896 11.951961,22.0515402 L15.4576222,19.0834174 C15.6683723,18.9049825 15.6945689,18.5894857 15.5161341,18.3787356 C15.4982803,18.3576485 15.4787093,18.3380775 15.4576222,18.3202237 L11.951961,15.3521009 C11.7412109,15.173666 11.4257142,15.1998627 11.2472793,15.4106128 C11.1708299,15.5009075 11.1288761,15.6153861 11.1288761,15.7336977 Z"
                          fill="#3699FF"
                          fill-rule="nonzero"
                          transform="translate(11.959697, 18.661508) rotate(-90.000000) translate(-11.959697, -18.661508) "
                        />
                      </g>
                    </svg>
                  </span>
                </div>
                <div className="mt-2 text-gray-500 fs-6 fw-semibold mb-3">
                  Drop files here or{" "}
                  <span className="text-primary fw-bold">browse</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-gray-700">
                <p className="text-center">
                  {selectedFile.length} file
                  {selectedFile.length !== 1 ? "s" : ""} uploaded
                </p>
              </div>
            )}
            <input
              type="file"
              multiple
              accept="audio/*"
              hidden
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            {selectedFile.length > 0 && (
              <div className="flex flex-col items-center gap-4 my-4">
                {loading && (
                  <div className="spinner spinner-primary spinner-lg spinner-right"></div>
                )}
                <button
                  className="btn btn-outline btn-primary p-3"
                  onClick={handleProcessClick}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Process"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="card mt-5 p-5 lg:h-[550px]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch">
          {/* Card 1 */}
          <div className="card p-5 flex items-center col-span-1 justify-center lg:h-[500px]">
            <div className="flex flex-col items-start gap-4">
              <label className="form-label flex items-center gap-2.5">
                <input
                  className="checkbox"
                  name="check"
                  type="checkbox"
                  checked={selectedSection === "transcript"}
                  onChange={() => setSelectedSection("transcript")}
                />
                Transcription
              </label>

              <label className="form-label flex items-center gap-2.5">
                <input
                  className="checkbox"
                  name="check"
                  type="checkbox"
                  checked={selectedSection === "summary"}
                  onChange={() => setSelectedSection("summary")}
                />
                Summarization
              </label>

              <label className="form-label flex items-center gap-2.5">
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={selectedSection === "sentiment"}
                  onChange={() => setSelectedSection("sentiment")}
                />
                Sentiment Analysis
              </label>

              <label className="form-label flex items-center gap-2.5">
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={selectedSection === "entities"}
                  onChange={() => setSelectedSection("entities")}
                />
                Entity Information
              </label>

              <label className="form-label flex items-center gap-2.5">
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={selectedSection === "topics"}
                  onChange={() => setSelectedSection("topics")}
                />
                Topic Modeling
              </label>

              <label className="form-label flex items-center gap-2.5">
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={selectedSection === "intents"}
                  onChange={() => setSelectedSection("intents")}
                />
                Intent Detection
              </label>
            </div>
          </div>
          {/* Card 2 */}
          <div className="card col-span-2 p-5 scrollable scrollbar-hide lg:h-[500px]">
            {transcriptionResult && transcriptionResult.length > 0 ? (
              transcriptionResult.map((item, index) => (
                <div key={index}>
                  {selectedSection === "transcript" && (
                    <div className="p-2">
                      <div className="card p-4">
                        <h3 className="text-center mb-2 dark:text-gray-800">
                          {item.filename}
                        </h3>
                        <p className="form-label text-justify">
                          {item.results.transcript}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedSection === "summary" && (
                    <div className="p-2">
                      <div className="card p-4 ">
                        <h3 className="text-center mb-2 dark:text-gray-800">
                          {item.filename}
                        </h3>
                        <p className="form-label text-justify">
                          {item.results.summary}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedSection === "sentiment" &&
                    item.results.sentiment && (
                      <div className="p-2 dark:text-gray-800">
                        <div className="card p-5">
                          <h3 className=" mb-1 text-center ">
                            {item.filename}
                          </h3>
                          <p className="text-sm text-center">
                            <span className="font-semibold text-primary pr-1">
                              Sentiment:
                            </span>
                            {item.results.sentiment.sentiment}
                          </p>
                          <p className="text-sm text-center">
                            <span className="font-semibold text-primary pr-1">
                              Sentiment Score:
                            </span>
                            {item.results.sentiment.sentiment_score}
                          </p>
                        </div>
                      </div>
                    )}
                  {selectedSection === "topics" && item.results.topics && (
                    <div className="p-2 dark:text-gray-800">
                      <div className="card p-5">
                        <h3 className="mb-2 mt-1 !text-center">
                          {item.filename}
                        </h3>
                        <ul>
                          {item.results.topics.map((topicItem, index) => (
                            <li key={index} className="mb-1 text-justify">
                              <p className="text-sm mb-1 ">
                                <span className="font-semibold text-primary pr-1">
                                  Text:
                                </span>{" "}
                                {topicItem.text}
                              </p>
                              {topicItem.topics?.map((subTopic, i) => (
                                <div key={i}>
                                  <p className="text-sm mb-1">
                                    <span className="font-semibold text-primary pr-1">
                                      Topic:
                                    </span>{" "}
                                    {subTopic.topic}
                                  </p>
                                  <p className="text-sm mb-1">
                                    <span className="font-semibold text-primary pr-1">
                                      Confidence Score:
                                    </span>{" "}
                                    {subTopic.confidence_score.toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {selectedSection === "intents" &&
                    item.results.intents &&
                    item.results.intents.segments && (
                      <div className="p-2">
                        <div className="card p-5 dark:text-gray-800">
                          <h3 className="mb-2 mt-1 text-center">
                            {item.filename}
                          </h3>
                          <ul>
                            {item.results.intents.segments.map(
                              (segment, index) => (
                                <li key={index} className="mb-1 ">
                                  <p className="text-sm mb-1">
                                    <span className="font-semibold text-primary pr-1">
                                      Intent:
                                    </span>{" "}
                                    {segment.intents[0]?.intent ?? "N/A"}
                                  </p>
                                  <p className="text-sm mb-1">
                                    <span className="font-semibold text-primary pr-1">
                                      Confidence Score:
                                    </span>{" "}
                                    {segment.intents[0]?.confidence_score
                                      ? segment.intents[0].confidence_score.toFixed(
                                          2
                                        )
                                      : "N/A"}
                                  </p>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  {selectedSection === "entities" && item.results.entities && (
                    <div className="p-2 dark:text-gray-800">
                      <div className="card p-5">
                        <h3 className=" mb-3 text-center ">{item.filename}</h3>
                        {item.results.entities.map((entity, index) => (
                          <div key={index} className="mb-2 text-sm">
                            <p>
                              <span className="font-semibold text-primary pr-1">
                                Label:
                              </span>
                              {entity.label}
                            </p>
                            <p>
                              <span className="font-semibold text-primary pr-1">
                                Value:
                              </span>
                              {entity.value}
                            </p>
                            <p>
                              <span className="font-semibold text-primary pr-1">
                                Confidence:
                              </span>
                              {(entity.confidence * 100).toFixed(2)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="dark:text-gray-800 text-center">
                No results available.
              </p>
            )}
          </div>
          {/* card 3 */}
          <div className="card col-span-1 p-5 lg:h-[500px] scrollable scrollbar-hide">
            <div className="flex flex-col items-center gap-4">
              <h1 className="dark:text-gray-800">Audio Files</h1>
              {selectedFile.map((file) => (
                <div className="flex items-center justify-between form-label">
                  <p>{file.name}</p>
                  <audio
                    ref={(el) => {
                      if (el) {
                        audioRefs.current[file.name] = el;

                        // Add the 'ended' event listener
                        el.onended = () => {
                          setAudioStatus((prev) => ({
                            ...prev,
                            [file.name]: { isPlaying: false },
                          }));
                        };
                      }
                    }}
                    src={audioSrc[file.name]}
                    preload="auto"
                  />
                  <button
                    onClick={() => togglePlayPause(file.name)}
                    className="text-blue-500 hover:text-blue-600 ml-2"
                  >
                    {audioStatus[file.name]?.isPlaying ? (
                      <span className="svg-icon svg-icon-primary svg-icon-2x">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                        >
                          <g fill="none">
                            <rect width="24" height="24" />
                            <path
                              d="M8,6 L10,6 C10.5522847,6 11,6.44771525 11,7 L11,17 C11,17.5522847 10.5522847,18 10,18 
                        L8,18 C7.44771525,18 7,17.5522847 7,17 L7,7 C7,6.44771525 7.44771525,6 8,6 Z 
                        M14,6 L16,6 C16.5522847,6 17,6.44771525 17,7 L17,17 C17,17.5522847 16.5522847,18 16,18 
                        L14,18 C13.4477153,18 13,17.5522847 13,17 L13,7 C13,6.44771525 13.4477153,6 14,6 Z"
                              fill="#3391F2"
                            />
                          </g>
                        </svg>
                      </span>
                    ) : (
                      <span className="svg-icon svg-icon-primary svg-icon-2x">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                        >
                          <g fill="none">
                            <rect width="24" height="24" />
                            <path
                              d="M9.82866499,18.2771971 L16.5693679,12.3976203 
                        C16.7774696,12.2161036 16.7990211,11.9002555 16.6175044,11.6921539 
                        C16.6029128,11.6754252 16.5872233,11.6596867 16.5705402,11.6450431 
                        L9.82983723,5.72838979 C9.62230202,5.54622572 9.30638833,5.56679309 9.12422426,5.7743283 
                        C9.04415337,5.86555116 9,5.98278612 9,6.10416552 
                        L9,17.9003957 C9,18.1765381 9.22385763,18.4003957 9.5,18.4003957 
                        C9.62084305,18.4003957 9.73759731,18.3566309 9.82866499,18.2771971 Z"
                              fill="#3391F2"
                            />
                          </g>
                        </svg>
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default Deepgram;
