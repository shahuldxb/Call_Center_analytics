import Sidebar from './components/Sidebar.tsx';
import Footer from './components/Footer.tsx';
import Header from './components/Header.tsx';
import KTComponent from './metronic/core';
import { useEffect } from 'react';
import KTLayout from './metronic/app/layouts/demo1.js';
import SearchModal from "./components/SearchModal.tsx";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import DataTable from "./components/DataTable/DataTab.js";
import SelectModel from './components/CallCenterProject/SelectModel.tsx';

const App: React.FC = () => {
  useEffect(() => {
    KTComponent.init();
    KTLayout.init();
  }, []);

  return (
    <>
    <Router>
      <div className="flex grow">
        <Sidebar />
        <div className="wrapper flex grow flex-col">
          <Header />
          <main className="grow content pt-5" id="content" role="content">
            <div className="container-fixed" id="content_container"></div>
            <div className="container-fixed">
            <Routes>
                <Route path="/" element={<SelectModel />} />
                <Route path="/datatable" element={<DataTable />} /> {/* DataTable Route */}
              </Routes>
            </div>
          </main>
          <Footer />
        </div>
      </div>
      <SearchModal />
      </Router>
    </>
  );
}

export default App
