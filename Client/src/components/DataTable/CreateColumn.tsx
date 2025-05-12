import React, { useState } from "react";

interface CreateColumnProps {
  columnName: string;
  setColumnName: (value: string) => void;
  handleAddColumn: () => void;
  fetchDatabases: () => void;
  fetchTables: (dbName: string) => void;
  fetchTableData: (tableName: string) => void;
  databases: Array<string | { name: string }>;
  tables: Array<string | { name: string }>;
}

const CreateColumn: React.FC<CreateColumnProps> = ({
  fetchTables,
  fetchDatabases,
  fetchTableData,
  databases,
  tables,
}) => {
  const [showSelectSection, setShowSelectSection] = useState(false);
  const handleInsertClick = () => {
    setShowSelectSection(true);
  };
  return (
    <div className="card">
      <div className="mt-5 flex flex-wrap items-center lg:items-end justify-between gap-5 pb-7.5">
        <div className="flex items-center gap-2.5 p-5">
          <button className="btn btn-light" onClick={handleInsertClick}>
            Insert
          </button>
          <button className="btn btn-light">Update</button>
        </div>
      </div>

      {showSelectSection && (
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
              const tableName = typeof table === "string" ? table : table.name;
              return (
                <option key={tableName} value={tableName}>
                  {tableName}
                </option>
              );
            })}
          </select>
        </div>
      )}
    </div>
  );
};

export default CreateColumn;
