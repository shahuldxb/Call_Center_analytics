import { useRef, useState } from "react";

function Whisper() {
  
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [results, setResults] = useState([]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log("selected files", files);
      setSelectedFiles(files);
    }
  };

  const handleProcessClick = async () => {
    if (!selectedFiles) return;
    setLoading(true);
    setResults([]);

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }

    const response = await fetch("http://localhost:5000/process-audio-stream", {
      method: "POST",
      body: formData,
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");

    if (!reader) return;

    let partial = "";
    const condition: boolean = true;
    while (condition) {
      const { value, done } = await reader.read();
      if (done) break;

      partial += decoder.decode(value, { stream: true });

      const parts = partial.split("\n\n");
      partial = parts.pop() || "";

      for (const part of parts) {
        if (part.startsWith("data: ")) {
          const jsonString = part.replace("data: ", "").trim();
          try {
            const parsed = JSON.parse(jsonString);
            setResults((prev) => [...prev, parsed]);
          } catch (e) {
            console.error("Failed to parse streamed JSON:", e);
          }
        }
      }
    }

    setLoading(false);
  };

  return (
    <>
      <div className="card">
        <div className="card-body p-4">
          <div className="d-flex flex-column dark:text-gray-800 align-items-center border border-dashed border-gray-400 rounded px-10 py-15 text-center">
            {!selectedFiles ? (
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
              <div className="flex flex-col items-center gap-4 my-4">
                {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}{" "}
                selected
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
            <input
              type="file"
              multiple
              accept="audio/*"
              hidden
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
      <div className="card mt-5 p-5 lg:h-[550px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* Card 2 */}
          <div className="card col-span-1 items-center p-5 lg:h-[500px]">
            <h1 className="pb-3 dark:text-gray-800">Transcription</h1>
            <div className="scrollable scrollbar-hide">
              {results.map((r, i) => (
                <div className="card p-3 mb-10">
                  <p className="border-b border-gray-300 p-3  dark:text-gray-800">
                    <span className="font-semibold text-sm">File Name:</span>{" "}
                    {r.filename}
                  </p>
                  <p className="p-2 form-label text-justify" key={i}>
                    {r.transcription}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* card 3 */}
          <div className="card col-span-1 items-center p-5 lg:h-[500px] ">
            <h1 className="pb-3 dark:text-gray-800">Translation</h1>
            <div className="scrollable scrollbar-hide">
              {results.map((r, i) => (
                <div className="card p-3 mb-10">
                  <p className="border-b border-gray-300  dark:text-gray-800 p-3">
                    <span className="font-semibold text-sm ">File Name:</span>{" "}
                    {r.filename}
                  </p>
                  <p
                    className="p-2 scrollable scrollbar-hide form-label text-justify"
                    key={i}
                  >
                    {r.translation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default Whisper;
