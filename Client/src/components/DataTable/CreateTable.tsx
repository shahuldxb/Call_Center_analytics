import React, { useState, useEffect } from "react";
interface CreateTableProps {
  tableName: string;
  setTableName: (name: string) => void;
  handleCreateTable: (
    tableName: string,
    columns: string[],
    rows: string[][],
    databaseName: string
  ) => Promise<void>;
}
const CreateTable: React.FC<CreateTableProps> = ({
  tableName,
  setTableName,
  handleCreateTable,
}) => {
  const [databaseName, setDatabaseName] = useState<string>("");
  const [databases, setDatabases] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<number>(1);
  const [numColumns, setNumColumns] = useState<number>(1);
  const [rowData, setRowData] = useState<string[][]>([]);
  const [columnTypes, setColumnTypes] = useState<string[]>([]);

  // Fetch available databases
  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5001/databases");
        const data = await response.json();
        setDatabases(data.map((db: { name: string }) => db.name));
      } catch (error) {
        console.error("Error fetching databases:", (error as Error).message);
      }
    };
    fetchDatabases();
  }, []);

  // Handle table creation
  const handleCreate = () => {
    if (!tableName || !databaseName) {
      alert("Please select a database and enter a table name");
      return;
    }

    if (columns.length !== numColumns || columnTypes.length !== numColumns) {
      alert("Please enter column names for all columns");
      return;
    }

    const combinedColumns = columns.map(
      (col, i) => `${col} ${columnTypes[i] || "VARCHAR(255)"}`
    );
    handleCreateTable(tableName, combinedColumns, rowData, databaseName);
    setTableName("");
    setNumColumns(1);
    setColumns([]);
    setColumnTypes([]);
    setRows(1);
    setRowData([]);
  };

  const handleRowDataChange = (
    rowIndex: number,
    colIndex: number,
    value: string
  ) => {
    const updatedRows = [...rowData];
    if (!updatedRows[rowIndex]) updatedRows[rowIndex] = [];
    updatedRows[rowIndex][colIndex] = value;
    setRowData(updatedRows);
  };
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title text-lg">Create Table</h3>
      </div>
      <div className="card-body scrollable-x scrollbar ">
      <div className="p-20">
        {/* Select Database */}
        <div className="flex items-center gap-3 pb-5">
          <label className="text-md w-[140px] dark:text-gray-900">Select Database:</label>
          <select
            className="input w-[300px]"
            value={databaseName}
            onChange={(e) => setDatabaseName(e.target.value)}
          >
            <option value="">Select Database</option>
            {databases.map((db) => (
              <option key={db} value={db}>
                {db}
              </option>
            ))}
          </select>
        </div>

        {/* Enter Table Name */}
        <div className="flex items-center gap-3 pb-5">
          <label className="text-md w-[140px] dark:text-gray-900">Table Name:</label>
          <input
            className="input w-[300px]"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="Enter Table Name"
            type="text"
          />
        </div>

        {/* Enter Number of Columns and Rows */}
        <div className="flex items-center gap-3 pb-5">
          <label className="text-md w-[140px] dark:text-gray-900">Number of Columns:</label>
          <input
            className="input w-[100px]"
            value={numColumns}
            onChange={(e) => setNumColumns(Number(e.target.value))}
            placeholder="Columns"
            type="number"
            min={1}
          />
        </div>
        <div className="flex items-center gap-3 pb-5">
          <label className="text-md w-[140px] dark:text-gray-900">Number of Rows:</label>
          <input
            className="input w-[100px]"
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
            placeholder="Rows"
            type="number"
            min={1}
          />
        </div>

        {Array.from({ length: numColumns }, (_, colIndex) => (
          <div className="flex items-center pb-5 gap-2" key={colIndex}>
            <label className="text-md w-[140px] dark:text-gray-900">Column {colIndex + 1} Name:</label>
            <input
              className="input w-[200px]"
              value={columns[colIndex] || ""}
              onChange={(e) => {
                const newColumns = [...columns];
                newColumns[colIndex] = e.target.value;
                setColumns(newColumns);
              }}
              placeholder={`Enter Column ${colIndex + 1} Name`}
              type="text"
            />
            <select
              className="input w-[180px]"
              value={columnTypes[colIndex] || ""}
              onChange={(e) => {
                const newTypes = [...columnTypes];
                newTypes[colIndex] = e.target.value;
                setColumnTypes(newTypes);
              }}
            >
              <option value="">Select Type</option>
              <option value="VARCHAR(255)">Text</option>
              <option value="INT">Integer</option>
              <option value="FLOAT">Decimal</option>
              <option value="DATE">Date</option>
              <option value="BIT">Boolean</option>
            </select>
          </div>
        ))}

        {/* Row Data Entry */}
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="flex gap-2 pb-5">
            {Array.from({ length: numColumns }, (_, colIndex) => (
              <input
                key={colIndex}
                className="input w-[150px]"
                placeholder={`Row ${rowIndex + 1}, Col ${colIndex + 1}`}
                value={rowData[rowIndex]?.[colIndex] || ""}
                onChange={(e) =>
                  handleRowDataChange(rowIndex, colIndex, e.target.value)
                }
                type="text"
              />
            ))}
          </div>
        ))}
      </div>
      </div>
      <div className="card-footer justify-center p-5">
        <button
          className="btn btn-primary w-[90px] text-lg"
          onClick={handleCreate}
        >
          Create
        </button>
      </div>
    </div>
  );
};
export default CreateTable;
