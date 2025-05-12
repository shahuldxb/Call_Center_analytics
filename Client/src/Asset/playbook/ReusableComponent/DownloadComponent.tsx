import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DownloadComponent = ({
  fileName = "download",
  headers = [],
  data = [],
}) => {
  const handleDownload = () => {
    const doc = new jsPDF();

    // Create table structure with dynamic headers and data
    autoTable(doc, {
      head: [headers],
      body: data,
    });

    // Save the PDF with the provided filename
    doc.save(`${fileName}.pdf`);
  };

  return (
    <button
      onClick={handleDownload}
      className="text-gray-600 rounded animate-bounce"
    >
    
      <span className="svg-icon svg-icon-primary svg-icon-2x ">
      <div className="rounded-full bg-gray-300 p-2 inline-flex">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40px"
          height="40px"
          viewBox="0 0 24 24"
          version="1.1"
        >
          <title>Stockholm-icons / Navigation / Arrow-to-bottom</title>
          <desc>Created with Sketch.</desc>
          <defs />
          <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <polygon points="0 0 24 0 24 24 0 24" />
            <rect
              fill="#000000"
              opacity="0.3"
              x="11"
              y="3"
              width="2"
              height="14"
              rx="1"
            />
            <path
              d="M6.70710678,16.7071068 C6.31658249,17.0976311 5.68341751,17.0976311 5.29289322,16.7071068 C4.90236893,16.3165825 4.90236893,15.6834175 5.29289322,15.2928932 L11.2928932,9.29289322 C11.6714722,8.91431428 12.2810586,8.90106866 12.6757246,9.26284586 L18.6757246,14.7628459 C19.0828436,15.1360383 19.1103465,15.7686056 18.7371541,16.1757246 C18.3639617,16.5828436 17.7313944,16.6103465 17.3242754,16.2371541 L12.0300757,11.3841378 L6.70710678,16.7071068 Z"
              fill="#000000"
              fill-rule="nonzero"
              transform="translate(12.000003, 12.999999) scale(1, -1) translate(-12.000003, -12.999999) "
            />
            <rect
              fill="#000000"
              opacity="0.3"
              x="3"
              y="19"
              width="18"
              height="2"
              rx="1"
            />
          </g>
        </svg>
        </div>
      </span>
    </button>
  );
};

export default DownloadComponent;
