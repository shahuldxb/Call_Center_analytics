import { useState } from "react";
import CreateDatabase from "./CreateDatabase";
import CreateTable from "./CreateTable";
import CreateColumn from "./CreateColumn";
interface AddFeaturesProps {
  fetchDatabases: () => void;
  fetchTables: (dbName: string) => void;
  fetchTableData: (tableName: string) => void;
  databases: Array<string | { name: string }>;
  tables: Array<string | { name: string }>;
}
const AddFeatures: React.FC<AddFeaturesProps> = ({
  fetchTableData,
  fetchDatabases,
  fetchTables,
  databases,
  tables,
}) => {
  const [dbName, setDbName] = useState<string>("");
  const [activeComponent, setActiveComponent] = useState<string>("");
  const [tableName, setTableName] = useState<string>("");
  const [columnName, setColumnName] = useState<string>("");
  const handleCreateDatabase = async () => {
    if (!dbName) {
      alert("Please enter a database name.");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5001/create-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dbName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      const result = await response.json();
      alert(result.message);
      setDbName("");
    } catch (error) {
      console.error("Error creating database:", error.message);
      alert("Error creating database: " + error.message);
    }
  };

  const handleCreateTable = async (
    tableName: string,
    columns: string[],
    rows: string[][],
    databaseName: string
  ) => {
    try {
      if (!Array.isArray(columns)) {
        console.error("Columns is not an array:", columns);
        return;
      }

      const response = await fetch("http://127.0.0.1:5001/create-table", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableName, columns, rows, databaseName }),
      });
      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error("Error creating table:", (error as Error).message);
    }
  };

  const handleAddColumn = async () => {
    if (!columnName) {
      alert("Please enter a column name");
      return;
    }
    try {
      const response = await fetch("http://127.0.0.1:5001/add-column", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ columnName }),
      });
      const data = await response.json();
      alert(data.message);
      setColumnName("");
    } catch (error) {
      console.error("Error adding column:", (error as Error).message);
    }
  };

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center lg:items-end justify-between gap-5 pb-7.5">
        <div></div>
        <div className="flex items-center gap-2.5 pe-5">
          <button
            className="btn btn-light"
            onClick={() => setActiveComponent("database")}
          >
            Create Database
          </button>
          <button
            className="btn btn-light"
            onClick={() => setActiveComponent("table")}
          >
            Create Table
          </button>
          <button
            className="btn btn-light"
            onClick={() => setActiveComponent("column")}
          >
            Add Column
          </button>
        </div>
      </div>
      {activeComponent === "database" && (
        <CreateDatabase
          dbName={dbName}
          setDbName={setDbName}
          handleCreateDatabase={handleCreateDatabase}
        />
      )}
      {activeComponent === "table" && (
        <CreateTable
          tableName={tableName}
          setTableName={setTableName}
          handleCreateTable={handleCreateTable}
        />
      )}
      {activeComponent === "column" && (
        <CreateColumn
          columnName={columnName}
          setColumnName={setColumnName}
          handleAddColumn={handleAddColumn}
          fetchDatabases={fetchDatabases}
          fetchTables={fetchTables}
          fetchTableData={fetchTableData}
          databases={databases}
          tables={tables}
        />
      )}
    </>
  );
};
export default AddFeatures;
