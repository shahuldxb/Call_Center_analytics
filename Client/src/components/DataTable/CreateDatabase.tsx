interface CreateDatabaseProps {
    dbName: string;
    setDbName: (value: string) => void;
    handleCreateDatabase: () => void;
  }

  const CreateDatabase: React.FC<CreateDatabaseProps> = ({
    dbName,
    setDbName,
    handleCreateDatabase,
  }) =>{
  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title text-lg">Create Database Name
          </h3>
        </div>
        <div className="card-body">
          <div className="flex items-center gap-3 p-16">
            <label className="col-2 col-form-label text-md dark:text-gray-900">Database Name: 
            </label>
            <input
              className="input w-[300px]"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              placeholder="Enter the databse name"
              type="text"
            />
          </div>
        </div>
        <div className="card-footer justify-center">
          <button className="btn btn-primary w-[90px] text-lg" onClick={handleCreateDatabase}>Create</button>
        </div>
      </div>
    </>
  );
}
export default CreateDatabase
