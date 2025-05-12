import { useState } from 'react';
import AzureModel from './AzureModel.tsx';
import Deepgram from './Deepgram.tsx';
import Whisper from './Whisper.tsx';

function SelectModel() {
  const [activeTab, setActiveTab] = useState('Azure');

  return (
    <div>
      <div className="tabs mb-5 text-lg gap-10 mr-5" data-tabs="true">
        <button
          className={`tab ${activeTab === 'Azure' ? 'active' : ''}`}
          onClick={() => setActiveTab('Azure')}
        >
          Azure
        </button>
        <button
          className={`tab ${activeTab === 'Whisper' ? 'active' : ''}`}
          onClick={() => setActiveTab('Whisper')}
        >
          Whisper
        </button>
        <button
          className={`tab ${activeTab === 'Deepgram' ? 'active' : ''}`}
          onClick={() => setActiveTab('Deepgram')}
        >
          Deepgram
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'Azure' && <AzureModel />}
        {activeTab === 'Whisper' && <Whisper />}
        {activeTab === 'Deepgram' && <Deepgram />}
      </div>
    </div>
  );
}

export default SelectModel;
