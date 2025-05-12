const sql = require("mssql");
const config = require("./dbConfigSeed");
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();
const transporter = require("./emailService");
const bcrypt = require("bcryptjs");

const registerUser = async (username, email, passwordHash) => {
  try {
    if (!username || username.trim() === "") {
      throw new Error("Username cannot be empty");
    }

    console.log("Received email in dbOperation:", email);
    console.log("Received passwordHash in dbOperation:", passwordHash);

    let pool = await sql.connect(config);

    await pool
      .request()
      .input("UserName", sql.NVarChar(255), username)
      .input("Email", sql.NVarChar(255), email)
      .input("PasswordHash", sql.NVarChar(64), passwordHash)
      .query(
        `INSERT INTO AdminandUserLoginTemp (UserName, Email, PasswordHash) 
       VALUES (@UserName, @Email, @PasswordHash)`
      );

    console.log("User registered successfully");
  } catch (error) {
    console.error("Database Error:", error.message);
    throw new Error("Failed to register user");
  } finally {
    sql.close(); // Close connection to prevent memory leaks
  }
};

module.exports = { registerUser };

const getUserByEmail = async (email) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("Email", sql.NVarChar(255), email)
      .query("SELECT * FROM AdminandUserLoginTemp WHERE Email = @Email");
    return result.recordset[0];
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fetch user by email");
  }
};

const loginUser = async (email, plainPassword) => {
  try {
    let pool = await sql.connect(config);

    // Fetch stored hashed password based on email
    const result = await pool
      .request()
      .input("Email", sql.NVarChar(255), email)
      .query(
        "SELECT UserName, PasswordHash FROM AdminandUserLoginTemp WHERE Email = @Email"
      );

    if (result.recordset.length === 0) {
      return { isAuthenticated: false, userName: null }; // No user found
    }

    const { UserName, PasswordHash } = result.recordset[0];

    // Compare the entered password with the hashed password in DB
    const isMatch = await bcrypt.compare(plainPassword, PasswordHash);

    if (!isMatch) {
      return { isAuthenticated: false, userName: null }; // Incorrect password
    }

    return { isAuthenticated: true, userName: UserName };
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
};

const getTablenames = async () => {
  try {
    let pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT TABLE_NAME FROM [Ceruleanseed].[INFORMATION_SCHEMA].[TABLES] WHERE TABLE_SCHEMA = 'dbo';"
      );
    return result;
  } catch (error) {
    throw new Error("Failed to get Table Name");
  }
};

const getCategoriesForTable = async (tableName) => {
  try {
    // Make sure the connection is established before executing the query
    await poolConnect;

    // Use parameterized query to avoid SQL injection
    const result = await pool
      .request()
      .input("tableName", sql.NVarChar, tableName).query(`SELECT column_name
      FROM information_schema.columns
      WHERE table_name = @tableName
      AND COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') <> 1;       
      `);

    const categories = result.recordset.map((row) => row.column_name);
    return categories;
  } catch (error) {
    console.log("Error:", error);
    throw new Error("Failed to get Categories for Table");
  }
};

const insertData = async (tableName, dataToInsert) => {
  try {
    const pool = await sql.connect(config);

    // Construct your SQL query based on the tableName and the data
    const columnNames = Object.keys(dataToInsert).join(", ");
    const values = Object.keys(dataToInsert)
      .map((key) => `@${key}`)
      .join(", ");
    const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${values})`;

    const inputParams = Object.entries(dataToInsert).map(([key, value]) => ({
      name: key,
      type: sql.NVarChar(255), // Change the type based on your column's data type
      value: value,
    }));

    const request = pool.request();
    inputParams.forEach((param) => {
      request.input(param.name, param.type, param.value);
    });

    await request.query(query);

    console.log("Data inserted successfully");
  } catch (error) {
    console.log("Error inserting data:", error);
    throw new Error("Failed to insert data");
  }
};

const UpdateData = async (tableName, dataToUpdate) => {
  try {
    console.log("tableName:", tableName);
    console.log("dataToUpdate:", dataToUpdate);

    const pool = await sql.connect(config);

    // Construct your SQL query based on the tableName and dataToUpdate
    const setClause = Object.keys(dataToUpdate)
      .map((key) => `${key} = @${key}`)
      .join(", ");

    // Construct the WHERE clause dynamically based on matching columns and values
    const whereConditions = Object.keys(dataToUpdate)
      .map((key) => `${key} = @${key}_condition`)
      .join(" OR ");

    const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereConditions}`;

    const inputParams = Object.entries(dataToUpdate).map(([key, value]) => ({
      name: key,
      type: sql.NVarChar(255), // Change the type based on your column's data type
      value: value,
    }));

    const request = pool.request();
    inputParams.forEach((param) => {
      request.input(param.name, param.type, param.value);
    });

    // Duplicate the input parameters to use for the condition
    inputParams.forEach((param) => {
      request.input(`${param.name}_condition`, param.type, param.value);
    });

    await request.query(query);

    console.log("Data updated successfully");
  } catch (error) {
    console.log("Error updating data:", error);
    throw new Error("Failed to update data");
  }
};

const getTablenameswithvalue = async (tableName) => {
  try {
    console.log("Attempting to connect to the database...");
    await poolConnect;

    console.log(`Executing query for table: ${tableName}`);
    const result = await pool
      .request()
      .input("tableName", sql.NVarChar, tableName)
      .query(`SELECT * FROM ${tableName};`);

    console.log("Query executed successfully. Result:", result);

    if (result.recordset.length === 0) {
      console.log("No rows found.");
    }

    return result.recordset; // Return the array of rows
  } catch (error) {
    console.error("Error occurred:", error);
    throw new Error("Failed to get table rows");
  }
};

const insertOrUpdateAudioToText = async (
  audioFilename,
  textContent,
  sentiment,
  confidenceScores,
  pronunciationAssessment
) => {
  try {
    const request = pool.request();
    const query = `
      MERGE AudioToText AS target
      USING (SELECT @audioFilename AS audio_filename) AS source
      ON target.audio_filename = source.audio_filename
      WHEN MATCHED THEN
        UPDATE SET
          text_content = @textContent,
          sentiment = @sentiment,
          confidence_positive = @confidencePositive,
          confidence_neutral = @confidenceNeutral,
          confidence_negative = @confidenceNegative,
          accuracy_score = @accuracyScore,
          fluency_score = @fluencyScore,
          comprehension_score = @comprehensionScore,
          prosody_score = @ProsodyScore,
          pronunciation_score = @pronunciationScore,
          updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (audio_filename, text_content, sentiment, confidence_positive, confidence_neutral, confidence_negative, accuracy_score, fluency_score, comprehension_score, prosody_score, pronunciation_score, updated_at)
        VALUES (@audioFilename, @textContent, @sentiment, @confidencePositive, @confidenceNeutral, @confidenceNegative, @accuracyScore, @fluencyScore, @comprehensionScore, @ProsodyScore, @pronunciationScore, GETDATE());
    `;
    request.input("audioFilename", sql.VarChar, audioFilename);
    request.input("textContent", sql.Text, textContent);
    request.input("sentiment", sql.VarChar, sentiment);
    request.input("confidencePositive", sql.Float, confidenceScores.positive);
    request.input("confidenceNeutral", sql.Float, confidenceScores.neutral);
    request.input("confidenceNegative", sql.Float, confidenceScores.negative);
    request.input(
      "accuracyScore",
      sql.Float,
      pronunciationAssessment.accuracyScore
    );
    request.input(
      "fluencyScore",
      sql.Float,
      pronunciationAssessment.fluencyScore
    );
    request.input(
      "comprehensionScore",
      sql.Float,
      pronunciationAssessment.compScore
    );
    request.input(
      "prosodyScore",
      sql.Float,
      pronunciationAssessment.prosodyScore
    );
    request.input(
      "pronunciationScore",
      sql.Float,
      pronunciationAssessment.pronScore
    );
    const result = await request.query(query);
    console.log("Upsert Result:", result);
    return result;
  } catch (error) {
    console.error(
      "Error inserting/updating data into AudioToText table:",
      error
    );
    throw error;
  }
};
const insertSpeechText = async (speechText) => {
  try {
    // Check if speechText is valid
    if (!speechText || speechText.trim() === "") {
      throw new Error("Speech text cannot be empty");
    }

    // Connect to the database
    await poolConnect;

    // Execute the query to insert speech text into the database
    const request = pool.request();
    const result = await request
      .input("SpeechText", sql.NVarChar, speechText)
      .query(
        "INSERT INTO SpeechToText (speech_text, created_date) VALUES (@SpeechText, GETDATE())"
      );

    return result.recordset; // Return the inserted recordset
  } catch (error) {
    console.error("Error inserting speech text:", error);
    throw new Error("Failed to insert speech text into the database");
  }
};

const insertSummaryData = async (
  textContent,
  extractSummary,
  abstractSummary
) => {
  try {
    await poolConnect; // Wait for the database connection to be established

    const request = pool.request();

    // Bind parameters using input() method
    request.input("textContent", sql.NVarChar, textContent);
    request.input("extractSummary", sql.NVarChar, extractSummary);
    request.input("abstractSummary", sql.NVarChar, abstractSummary);

    // Insert data into the TextSummarization table
    const result = await request.query(`
      INSERT INTO TextSummarization (text_content, extract_summary, abstract_summary)
      VALUES (@textContent, @extractSummary, @abstractSummary);
    `);

    console.log("Data inserted successfully:", result);

    return result;
  } catch (error) {
    console.error("Error inserting data:", error);
    throw error;
  }
};

const insertSentimentAnalysisResult = async (sentimentResult) => {
  try {
    await poolConnect; // Ensure that the pool is connected before proceeding
    const request = pool.request();

    // Prepare the SQL query
    const query = `
      INSERT INTO SentimentAnalysis (document_id, sentiment, positive_score, neutral_score, negative_score, sentence_text)
      VALUES (@document_id, @sentiment, @positive_score, @neutral_score, @negative_score, @sentence_text)
    `;

    // Insert sentiment analysis result into the database
    await request.input("document_id", sql.Int, sentimentResult.id); // Assuming sentimentResult.id is the document_id
    await request.input(
      "sentiment",
      sql.NVarChar(10),
      sentimentResult.sentiment
    );

    // Check if confidenceScores is defined before accessing its properties
    if (sentimentResult.confidenceScores) {
      await request.input(
        "positive_score",
        sql.Float,
        sentimentResult.confidenceScores.positive || 0
      );
      await request.input(
        "neutral_score",
        sql.Float,
        sentimentResult.confidenceScores.neutral || 0
      );
      await request.input(
        "negative_score",
        sql.Float,
        sentimentResult.confidenceScores.negative || 0
      );
    } else {
      // If confidenceScores is undefined, set default values
      await request.input("positive_score", sql.Float, 0);
      await request.input("neutral_score", sql.Float, 0);
      await request.input("negative_score", sql.Float, 0);
    }

    await request.input("sentence_text", sql.Text, ""); // No sentence provided, leaving it empty
    await request.query(query);

    console.log(
      "Sentiment analysis result inserted successfully into the database."
    );
  } catch (error) {
    console.error("Error inserting sentiment analysis result:", error);
    throw error;
  }
};

const saveOTP = async (email, otp) => {
  try {
    const pool = await sql.connect(config);
    await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("otp", sql.Int, otp)
      .query("INSERT INTO OTPTable (email, otp) VALUES (@email, @otp)");
    return true;
  } catch (error) {
    console.error("Error saving OTP:", error);
    return false;
  }
};

const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"App Name" <your-email@example.com>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}. It is valid for 1 minute.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return false;
  }
};

// Function to fetch OTP record from the database
const getOTPRecord = async (email, otp) => {
  try {
    const result = await sql.query`
      SELECT otp FROM OTPTable 
      WHERE email = ${email} AND otp = ${otp}`;

    return result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error("Error fetching OTP record:", error);
    throw new Error("Database error while fetching OTP.");
  }
};

// Function to delete OTP record from the database
const deleteOTPRecord = async (email, otp) => {
  try {
    await sql.query`
      DELETE FROM OTPTable 
      WHERE email = ${email} AND otp = ${otp}`;
  } catch (error) {
    console.error("Error deleting OTP record:", error);
    throw new Error("Database error while deleting OTP.");
  }
};

const updatePassword = async (email, newPassword) => {
  try {
    const pool = await sql.connect(config);

    // Check if the user exists
    const checkQuery = `SELECT * FROM AdminandUserLoginTemp WHERE email = @Email`;
    const checkRequest = pool.request();
    checkRequest.input("Email", sql.VarChar, email);
    const userResult = await checkRequest.query(checkQuery);

    if (userResult.recordset.length === 0) {
      return { success: false, status: 404, message: "User not found" };
    }

    // 🚀 Update the password directly **without hashing**
    const updateQuery = `UPDATE AdminandUserLoginTemp SET PasswordHash = @Password WHERE Email = @Email`;
    const updateRequest = pool.request();
    updateRequest.input("Password", sql.VarChar, newPassword); // No bcrypt hashing
    updateRequest.input("Email", sql.VarChar, email);
    const updateResult = await updateRequest.query(updateQuery);

    if (updateResult.rowsAffected[0] === 0) {
      return {
        success: false,
        status: 500,
        message: "Failed to update password",
      };
    }

    return { success: true, message: "Password updated successfully" };
  } catch (err) {
    console.error("Database error:", err);
    return { success: false, status: 500, message: "Database error" };
  }
};

const findUserByEmail = async (email) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("Email", sql.NVarChar(255), email)
      .query("SELECT * FROM AdminandUserLoginTemp WHERE Email = @Email");

    return result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error("DB Error - findUserByEmail:", error);
    throw new Error("Database operation failed");
  }
};

const getDatabases = async () => {
  try {
    await poolConnect; // Ensure the connection is established
    const result = await pool.request().query(`SELECT name FROM sys.databases`);
    return result.recordset;
  } catch (err) {
    console.error("Error fetching databases:", err.message);
    throw new Error("Error fetching databases");
  }
};

const getTables = async (database) => {
  try {
    await poolConnect; // Ensure the connection is established
    const result = await pool
      .request()
      .query(`USE ${database}; SELECT name FROM sys.tables`);
    return result.recordset;
  } catch (err) {
    console.error("Error fetching tables:", err.message);
    throw new Error("Error fetching tables");
  }
};

const getTableData = async (database, table) => {
  try {
    await poolConnect; // Ensure the connection is established
    const result = await pool
      .request()
      .query(`USE ${database}; SELECT * FROM ${table}`);
    return result.recordset;
  } catch (err) {
    console.error("Error fetching table data:", err.message);
    throw new Error("Error fetching table data");
  }
};

const createDatabase = async (dbName) => {
  try {
    await poolConnect; // Ensure the connection is established
    await pool.request().query(`CREATE DATABASE ${dbName}`);
    console.log(`✅ Database "${dbName}" created successfully!`);
    return { message: `Database "${dbName}" created successfully!` };
  } catch (err) {
    console.error("Error creating database:", err.message);
    throw new Error("Error creating database");
  }
};

const createTable = async (databaseName, tableName, columns, rowData) => {
  if (
    !databaseName ||
    !tableName ||
    !Array.isArray(columns) ||
    columns.length === 0
  ) {
    throw new Error("Database name, table name, and columns are required");
  }

  try {
    await poolConnect;

    // Switch to the database
    const useDbQuery = `USE [${databaseName}]`;
    await pool.request().query(useDbQuery);

    // Construct column definitions correctly
    const columnDefinitions = columns
      .map((colDef) => {
        const firstSpaceIndex = colDef.indexOf(" ");
        if (firstSpaceIndex === -1) {
          throw new Error(`Invalid column definition: ${colDef}`);
        }
        const colName = colDef.substring(0, firstSpaceIndex);
        const colType = colDef.substring(firstSpaceIndex + 1);
        return `[${colName}] ${colType}`;
      })
      .join(", ");

    // Create the table
    const createTableQuery = `CREATE TABLE [${tableName}] (${columnDefinitions})`;
    await pool.request().query(createTableQuery);
    console.log(
      `Table '${tableName}' created successfully in database '${databaseName}'`
    );

    // Insert row data (if available)
    if (Array.isArray(rowData) && rowData.length > 0) {
      for (const row of rowData) {
        const columnNames = columns
          .map((colDef) => `[${colDef.split(" ")[0]}]`)
          .join(", ");
        const values = row
          .map((value) =>
            typeof value === "string" ? `'${value.replace(/'/g, "''")}'` : value
          )
          .join(", ");

        const insertQuery = `INSERT INTO [${tableName}] (${columnNames}) VALUES (${values})`;
        await pool.request().query(insertQuery);
        console.log(`Inserted row: ${values}`);
      }
    }

    return `Table '${tableName}' created successfully with ${
      rowData?.length ?? 0
    } rows in database '${databaseName}'`;
  } catch (err) {
    throw new Error(`Error creating table or inserting data: ${err.message}`);
  }
};

module.exports = {
  sql,
  registerUser,
  getUserByEmail,
  loginUser,
  getTablenames,
  getCategoriesForTable,
  insertData,
  UpdateData,
  getTablenameswithvalue,
  insertOrUpdateAudioToText,
  insertSpeechText,
  insertSummaryData,
  insertSentimentAnalysisResult,
  saveOTP,
  sendOTPEmail,
  getOTPRecord,
  deleteOTPRecord,
  updatePassword,
  findUserByEmail,
  getDatabases,
  getTables,
  getTableData,
  createDatabase,
  createTable,
  // insertDeepgramAudioAnalysis
};
