const { Pool } = require("pg");

let pool = null;

function getPool() {
  if (!pool) {
    if (!process.env.NEON_DATABASE_URL) {
      throw new Error(
        "Database connection string (NEON_DATABASE_URL) is not configured"
      );
    }
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: true },
    });
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

async function executeQuery(queryText, params = [], client = null) {
  const shouldReleaseClient = !client;
  try {
    client = client || (await getPool().connect());
    const result = await client.query(queryText, params);
    return { success: true, rowCount: result.rowCount, rows: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    if (shouldReleaseClient && client) client.release();
  }
}

async function query(text, params = []) {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateMetadata(status, error = null) {
  try {
    await query(
      "UPDATE metadata SET last_refresh = NOW(), status = $1, error = $2",
      [status, error]
    );
  } catch (error) {
    console.error("Failed to update metadata:", error);
  }
}

async function getMetadata() {
  try {
    const result = await query("SELECT * FROM metadata LIMIT 1");
    return (
      result.rows[0] || { last_refresh: null, status: "unknown", error: null }
    );
  } catch (error) {
    return { last_refresh: null, status: "error", error: error.message };
  }
}

async function initializeDatabase() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS repositories (
        id SERIAL PRIMARY KEY,
        github_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        html_url TEXT NOT NULL,
        stargazers_count INTEGER NOT NULL DEFAULT 0,
        forks_count INTEGER NOT NULL DEFAULT 0,
        watchers_count INTEGER NOT NULL DEFAULT 0,
        language TEXT,
        languages TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE,
        last_refreshed TIMESTAMP WITH TIME ZONE
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS issues (
        id SERIAL PRIMARY KEY,
        github_id TEXT UNIQUE NOT NULL,
        repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        number INTEGER NOT NULL,
        html_url TEXT NOT NULL,
        state TEXT NOT NULL,
        comments INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE,
        assignee TEXT,
        is_good_first_issue BOOLEAN NOT NULL DEFAULT TRUE,
        last_refreshed TIMESTAMP WITH TIME ZONE
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS labels (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        UNIQUE(name)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS issue_labels (
        issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
        label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
        PRIMARY KEY (issue_id, label_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS metadata (
        id SERIAL PRIMARY KEY,
        last_refresh TIMESTAMP WITH TIME ZONE,
        status TEXT,
        error TEXT
      )
    `);

    try {
      await query(`DROP VIEW IF EXISTS orphaned_labels`);

      await query(`
        CREATE VIEW orphaned_labels AS
        SELECT l.id
        FROM labels l
        WHERE NOT EXISTS (
          SELECT 1
          FROM issue_labels il
          JOIN issues i ON il.issue_id = i.id
          WHERE il.label_id = l.id
          AND i.state = 'open'
          AND i.is_good_first_issue = TRUE
        )
      `);
    } catch (viewError) {
      console.error("Error creating orphaned_labels view:", viewError);
    }

    const metadataResult = await query("SELECT * FROM metadata LIMIT 1");
    if (metadataResult.rows.length === 0) {
      await query(
        "INSERT INTO metadata (last_refresh, status) VALUES (NOW(), $1)",
        ["initialized"]
      );
    }

    const indexes = [
      "CREATE INDEX IF NOT EXISTS issues_repository_id ON issues(repository_id)",
      "CREATE INDEX IF NOT EXISTS issues_updated_at ON issues(updated_at)",
      "CREATE INDEX IF NOT EXISTS issues_state ON issues(state)",
      "CREATE INDEX IF NOT EXISTS repositories_stargazers_count ON repositories(stargazers_count)",
      "CREATE INDEX IF NOT EXISTS repositories_languages ON repositories(languages)",
      "CREATE INDEX IF NOT EXISTS repositories_full_name ON repositories(full_name)",
      "CREATE INDEX IF NOT EXISTS issues_last_refreshed ON issues(last_refreshed)",
      "CREATE INDEX IF NOT EXISTS issues_state_good_first ON issues(state, is_good_first_issue)",
      "CREATE INDEX IF NOT EXISTS issues_updated_at_id ON issues(updated_at, id)",
      "CREATE INDEX IF NOT EXISTS issues_created_at_id ON issues(created_at, id)",
      "CREATE INDEX IF NOT EXISTS issues_comments_id ON issues(comments, id)",
    ];

    for (const indexSql of indexes) {
      try {
        await query(indexSql);
      } catch (indexError) {
        console.error(`Error creating index: ${indexSql}`, indexError);
      }
    }
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

async function executeScript(operationName, mainFunction) {
  console.log(`Starting ${operationName} process...`);
  const startTime = Date.now();

  try {
    console.log("Connecting to database...");
    getPool();

    console.log("Initializing database...");
    await initializeDatabase();

    const result = await mainFunction();

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`${operationName} completed in ${totalDuration}s`);

    return {
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
      duration: totalDuration + "s",
    };
  } catch (error) {
    console.error(`${operationName} failed:`, error.message);
    await updateMetadata("error", error.message);
    return { success: false, error: error.message };
  } finally {
    console.log("Closing database connection...");
    await closePool();
    console.log(`${operationName} process complete`);
  }
}

module.exports = {
  getPool,
  closePool,
  query,
  executeQuery,
  transaction,
  updateMetadata,
  getMetadata,
  initializeDatabase,
  executeScript,
};
