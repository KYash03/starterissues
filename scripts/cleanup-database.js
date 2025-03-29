const {
  executeScript,
  executeQuery,
  transaction,
  getPool,
} = require("../src/lib/services/db-service");
const { invalidateApiCaches } = require("../src/lib/services/cache-service");

async function genericCleanup(client, options) {
  const { name, countQuery, deleteQuery, params = [] } = options;
  console.log(`Checking for ${name}...`);
  const countResult = await client.query(countQuery);
  const itemCount = parseInt(countResult.rows[0].count);
  console.log(`Found ${itemCount} ${name} to clean up`);
  if (itemCount === 0) return { success: true, operation: name, rowCount: 0 };

  const result = await executeQuery(deleteQuery, params, client);
  console.log(
    result.success
      ? `Successfully deleted ${result.rowCount} ${name}`
      : `Error deleting ${name}: ${result.error}`
  );
  return { ...result, operation: name };
}

const cleanupDefinitions = [
  {
    name: "duplicate_issues",
    countQuery: `
      SELECT COUNT(*) FROM (
        SELECT github_id
        FROM issues
        GROUP BY github_id
        HAVING COUNT(*) > 1
      ) as duplicates`,
    deleteQuery: `
      DELETE FROM issues 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM issues 
        GROUP BY github_id
      )
      AND github_id IN (
        SELECT github_id 
        FROM (
          SELECT github_id
          FROM issues
          GROUP BY github_id
          HAVING COUNT(*) > 1
        ) as duplicates
      )`,
  },
  {
    name: "orphaned_labels",
    countQuery: "SELECT COUNT(*) FROM orphaned_labels",
    deleteQuery:
      "DELETE FROM labels WHERE id IN (SELECT id FROM orphaned_labels)",
  },
  {
    name: "closed_issues",
    countQuery: "SELECT COUNT(*) FROM issues WHERE state = 'closed'",
    deleteQuery: "DELETE FROM issues WHERE state = 'closed'",
  },
  {
    name: "non_gfi_issues",
    countQuery: "SELECT COUNT(*) FROM issues WHERE is_good_first_issue = FALSE",
    deleteQuery: "DELETE FROM issues WHERE is_good_first_issue = FALSE",
  },
  {
    name: "orphaned_repositories",
    countQuery: `SELECT COUNT(*) FROM repositories r
    WHERE NOT EXISTS (
      SELECT 1 FROM issues i
      WHERE i.repository_id = r.id
      AND i.state = 'open'
      AND i.is_good_first_issue = TRUE
    )`,
    deleteQuery: `DELETE FROM repositories r
    WHERE NOT EXISTS (
      SELECT 1 FROM issues i
      WHERE i.repository_id = r.id
      AND i.state = 'open'
      AND i.is_good_first_issue = TRUE
    )`,
  },
  {
    name: "inactive_issues",
    countQuery: `SELECT COUNT(*) FROM issues 
    WHERE updated_at < NOW() - INTERVAL '7 days'
    AND is_good_first_issue = TRUE
    AND state = 'open'`,
    deleteQuery: `DELETE FROM issues 
    WHERE updated_at < NOW() - INTERVAL '7 days'
    AND is_good_first_issue = TRUE
    AND state = 'open'`,
  },
  {
    name: "orphaned_issue_labels",
    countQuery: `SELECT COUNT(*) FROM issue_labels il
    WHERE NOT EXISTS (SELECT 1 FROM issues i WHERE i.id = il.issue_id)
    OR NOT EXISTS (SELECT 1 FROM labels l WHERE l.id = il.label_id)`,
    deleteQuery: `DELETE FROM issue_labels il
    WHERE NOT EXISTS (
      SELECT 1 FROM issues i WHERE i.id = il.issue_id
    ) OR NOT EXISTS (
      SELECT 1 FROM labels l WHERE l.id = il.label_id
    )`,
  },
  {
    name: "unused_languages",
    custom: true,
    handler: async (client) => {
      console.log(
        "Checking for languages not used in repositories with open issues..."
      );
      const activeLanguagesResult = await client.query(`
        SELECT DISTINCT unnest(r.languages) as language
        FROM repositories r
        JOIN issues i ON r.id = i.repository_id
        WHERE i.state = 'open'
        AND i.is_good_first_issue = TRUE
        AND r.languages IS NOT NULL
      `);

      if (activeLanguagesResult.rows.length === 0) {
        console.log("No active languages found");
        return { success: true, operation: "unused_languages", rowCount: 0 };
      }

      const activeLanguages = activeLanguagesResult.rows.map(
        (row) => row.language
      );
      console.log(`Found ${activeLanguages.length} active languages`);

      const result = await executeQuery(
        `WITH repos_to_update AS (
           SELECT id, languages, 
             array(
               SELECT lang
               FROM unnest(languages) as lang
               WHERE lang = ANY($1::text[])
             ) as new_languages
           FROM repositories
           WHERE array_length(languages, 1) > 0
         )
         UPDATE repositories r
         SET languages = rtu.new_languages
         FROM repos_to_update rtu
         WHERE r.id = rtu.id
         AND r.languages <> rtu.new_languages
         RETURNING r.id`,
        [activeLanguages],
        client
      );

      console.log(
        result.success
          ? `Successfully updated ${result.rowCount} repositories to remove unused languages`
          : `Error updating languages: ${result.error}`
      );
      return { ...result, operation: "unused_languages" };
    },
  },
];

async function vacuumDatabase() {
  console.log("Running VACUUM ANALYZE to optimize database...");
  try {
    const vacuumClient = await getPool().connect();
    try {
      await vacuumClient.query("VACUUM ANALYZE");
      console.log("Successfully vacuumed and analyzed database");
      return { success: true, operation: "vacuum", rowCount: 0 };
    } finally {
      vacuumClient.release();
    }
  } catch (error) {
    console.error(`Error during VACUUM: ${error.message}`);
    return {
      success: false,
      error: error.message,
      operation: "vacuum",
      rowCount: 0,
    };
  }
}

async function comprehensiveDatabaseCleanup() {
  console.log("Starting database cleanup operation...");
  const startTime = Date.now();
  const results = [];

  return transaction(async (client) => {
    try {
      for (const def of cleanupDefinitions) {
        if (def.custom) {
          results.push(await def.handler(client));
        } else {
          results.push(await genericCleanup(client, def));
        }
      }

      await client.query("DEALLOCATE ALL");
      await client.query(
        "DROP TABLE IF EXISTS temp_tables, temp_data, temp_results CASCADE"
      );

      console.log(
        `Database cleanup transaction completed in ${(
          (Date.now() - startTime) /
          1000
        ).toFixed(2)}s`
      );
      return results;
    } catch (error) {
      console.error(`Database cleanup failed: ${error.message}`);
      throw error;
    }
  });
}

async function runComprehensiveCleanup() {
  return executeScript("Database cleanup", async () => {
    const results = await comprehensiveDatabaseCleanup();
    results.push(await vacuumDatabase());

    await invalidateApiCaches();

    return {
      success: results.every((r) => r.success),
      operations: results.map((r) => ({
        operation: r.operation,
        success: r.success,
        count: r.rowCount || 0,
        error: r.error,
      })),
    };
  });
}

if (require.main === module) {
  runComprehensiveCleanup()
    .then((result) => {
      console.log(`Cleanup summary: ${JSON.stringify(result, null, 2)}`);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(`Unhandled exception: ${error.message}`);
      process.exit(1);
    });
}
