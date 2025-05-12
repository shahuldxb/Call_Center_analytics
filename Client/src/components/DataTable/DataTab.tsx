import React, { useEffect } from "react";
import AddFeatures from "./AddFeatures";
function DataTab() {
  const [databases, setDatabases] = React.useState([]);
  const [tables, setTables] = React.useState([]);
  const [selectedDatabase, setSelectedDatabase] = React.useState("");
  const [tableData, setTableData] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentData, setCurrentData] = React.useState([]);
  const [selectAll, setSelectAll] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  const [showAddTable, setShowAddTable] = React.useState(false);
  
  // initialize and update the currentData
  useEffect(() => {
    setCurrentData(tableData.slice(0, itemsPerPage));
  }, [tableData, itemsPerPage]);

  // 🔍 Handle Search Input Change
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filteredData = tableData.filter((row: Record<string, unknown>) =>
      Object.values(row).some(
        (value) =>
          typeof value === "string" && value.toLowerCase().includes(query)
      )
    );

    setCurrentData(filteredData);
  };

  //handle checkbox for select all row
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSelectAll(e.target.checked);
    if (e.target.checked) {
      setSelectedRows(currentData.map((_, index) => index));
    } else {
      setSelectedRows([]);
    }
  };

  // handle select checkbox for row
  const handleRowSelect = (index: number): void => {
    const isSelected = selectedRows.includes(index);
    if (isSelected) {
      setSelectedRows(selectedRows.filter((i) => i !== index));
    } else {
      setSelectedRows([...selectedRows, index]);
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number): void => {
    const startIndex = (newPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setCurrentPage(newPage);
    setCurrentData(tableData.slice(startIndex, endIndex));
  };

  // fetch sql database
  const fetchDatabases = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5001/databases");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }
      const data = await response.json();
      setDatabases(data);
    } catch (error) {
      console.error("Error fetching databases:", error.message);
    }
  };

  // fetch sql table
  const fetchTables = async (database: string): Promise<void> => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5001/tables?database=${database}`
      );
      const data = await response.json();
      setTables(data);
      setSelectedDatabase(database);
    } catch (error) {
      console.error("Error fetching tables:", error);
    }
  };

  // fetch sql table data
  const fetchTableData = async (table: string): Promise<void> => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5001/tableData?database=${selectedDatabase}&table=${table}`
      );
      const data = await response.json();
      setTableData(data);
    } catch (error) {
      console.error("Error fetching table data:", error);
    }
  };
  const handleAddTable = () => {
    setShowAddTable(true);
  };
  const handleBackClick=()=>{
    setShowAddTable(false)
  }
  return (
    <>
      <div className="container-fixed">
        <div className="flex flex-wrap items-center lg:items-end justify-between gap-5 pb-7.5">
          <div className="flex flex-col justify-center gap-2">
            <h1 className="text-xl font-medium leading-none text-gray-900">
              DataTable
            </h1>
          </div>
          <div className="flex items-center gap-2.5 w-[300px]">
            <select
              className="select"
              name="select"
              onClick={fetchDatabases}
              onChange={(e) => fetchTables(e.target.value)}
            >
              <option value="">Select Database</option>
              {databases.map((db) => {
                const dbName = typeof db === "string" ? db : db.name;
                return (
                  <option key={dbName} value={dbName}>
                    {dbName}
                  </option>
                );
              })}
            </select>
            <select
              className="select"
              name="select"
              onChange={(e) => fetchTableData(e.target.value)}
            >
              <option value="">Select Table </option>
              {tables.map((table) => {
                const tableName =
                  typeof table === "string" ? table : table.name;
                return (
                  <option key={tableName} value={tableName}>
                    {tableName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
      <div className="card mt-5">
        <div className="grid gap-5 lg:gap-7.5">
          <div className="card card-grid min-w-full">
            <div className="card-header flex-wrap py-5">
              <span className="svg-icon svg-icon-primary svg-icon-2x" onClick={handleBackClick}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24px"
                  height="24px"
                  viewBox="0 0 24 24"
                  version="1.1"
                >
                  <title>Stockholm-icons / Navigation / Arrow-left</title>
                  <desc>Created with Sketch.</desc>
                  <defs />
                  <g
                    stroke="none"
                    stroke-width="1"
                    fill="none"
                    fill-rule="evenodd"
                  >
                    <polygon points="0 0 24 0 24 24 0 24" />
                    <rect
                      fill="#8698AE"
                      opacity="0.3"
                      transform="translate(12.000000, 12.000000) scale(-1, 1) rotate(-90.000000) translate(-12.000000, -12.000000) "
                      x="11"
                      y="5"
                      width="2"
                      height="14"
                      rx="1"
                    />
                    <path
                      d="M3.7071045,15.7071045 C3.3165802,16.0976288 2.68341522,16.0976288 2.29289093,15.7071045 C1.90236664,15.3165802 1.90236664,14.6834152 2.29289093,14.2928909 L8.29289093,8.29289093 C8.67146987,7.914312 9.28105631,7.90106637 9.67572234,8.26284357 L15.6757223,13.7628436 C16.0828413,14.136036 16.1103443,14.7686034 15.7371519,15.1757223 C15.3639594,15.5828413 14.7313921,15.6103443 14.3242731,15.2371519 L9.03007346,10.3841355 L3.7071045,15.7071045 Z"
                      fill="#8698AE"
                      fill-rule="nonzero"
                      transform="translate(9.000001, 11.999997) scale(-1, -1) rotate(90.000000) translate(-9.000001, -11.999997) "
                    />
                  </g>
                </svg>
              </span>
              <div className="flex gap-6">
                <div className="relative">
                  <i className="ki-filled ki-magnifier leading-none text-md text-gray-500 absolute top-1/2 start-0 -translate-y-1/2 ms-3"></i>
                  <input
                    className="input input-md ps-8 p-5"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search Teams"
                    type="text"
                  />
                </div>
                <label className="switch switch-sm">
                  <button className="btn btn-light" onClick={handleAddTable}>
                    ADD
                  </button>
                </label>
              </div>
            </div>
            <div className="card-body">
              {showAddTable ? (
                <AddFeatures databases={databases} tables={tables} fetchTableData={fetchTableData} fetchDatabases={fetchDatabases}  fetchTables={fetchTables}/>
              ) : (
                <>
                <div className="scrollable-x-auto">
                  <table className="table w-full border-collapse border border-gray-300">
                    <thead>
                      {tableData.length > 0 && (
                        <tr>
                          <th className="p-5 text-left border border-gray-300">
                            <input
                              className="checkbox"
                              name="check"
                              type="checkbox"
                              value="1"
                              checked={selectAll}
                              onChange={handleSelectAll}
                            />
                          </th>
                          {Object.keys(tableData[0]).map((col) => (
                            <th
                              key={col}
                              className="p-5 text-left border border-gray-300 whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {currentData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-100">
                          <td className="p-5 border border-gray-300 text-left">
                            <input
                              type="checkbox"
                              className="checkbox"
                              name="check"
                              value="1"
                              checked={selectedRows.includes(index)}
                              onChange={() => handleRowSelect(index)}
                            />
                          </td>
                          {Object.values(row).map(
                            (value: string, idx: number) => (
                              <td
                                key={idx}
                                className="p-5 border border-gray-300 text-left break-words max-w-xs"
                              >
                                {typeof value === "string" &&
                                value.length > 50 ? (
                                  <div className="scrollable-y max-h-20">
                                    {value}
                                  </div>
                                ) : (
                                  value
                                )}
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="card-footer justify-center md:justify-between flex-col md:flex-row gap-5 text-gray-600 text-2sm font-medium">
                <div className="flex items-center gap-2 order-2 md:order-1">
                  Show
                  <select
                    className="select select-sm w-16"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  >
                    {[5, 10, 20, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  per page
                </div>
                <div className="flex items-center gap-4 order-1 md:order-2">
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="btn btn-sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
              </>
              )}
              
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DataTab;
