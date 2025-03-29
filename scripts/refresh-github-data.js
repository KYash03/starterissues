const { executeScript } = require("../src/lib/services/db-service");
const {
  refreshGitHubData,
  refreshExistingIssues,
} = require("../src/lib/services/github");
const { invalidateApiCaches } = require("../src/lib/services/cache-service");

async function refreshAllGitHubData() {
  return executeScript("GitHub data refresh", async () => {
    console.log("Fetching new GitHub issues...");
    const newIssuesStartTime = Date.now();
    const newIssuesResult = await refreshGitHubData();
    const newIssuesDuration = (
      (Date.now() - newIssuesStartTime) /
      1000
    ).toFixed(2);

    console.log(
      `Fetched ${newIssuesResult.count || 0} new issues (${newIssuesDuration}s)`
    );

    console.log("Refreshing existing issues...");
    const existingIssuesStartTime = Date.now();
    const existingIssuesResult = await refreshExistingIssues(2, 50);
    const existingIssuesDuration = (
      (Date.now() - existingIssuesStartTime) /
      1000
    ).toFixed(2);

    console.log(
      `Updated ${
        existingIssuesResult.updatedCount || 0
      } existing issues (${existingIssuesDuration}s)`
    );

    await invalidateApiCaches();

    const errors = [
      ...(newIssuesResult.errors || []),
      ...(existingIssuesResult.errors || []),
    ];

    if (errors.length > 0) {
      console.warn(`Encountered ${errors.length} errors during refresh`);
      console.log(
        "Error summary:",
        JSON.stringify(errors.slice(0, 3), null, 2)
      );
      if (errors.length > 3) {
        console.log(`... and ${errors.length - 3} more errors`);
      }
    }

    return {
      newIssues: newIssuesResult.count || 0,
      updatedIssues: existingIssuesResult.updatedCount || 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  });
}

if (require.main === module) {
  refreshAllGitHubData()
    .then((result) => {
      console.log(
        "Final result:",
        JSON.stringify(
          {
            success: result.success,
            newIssues: result.newIssues,
            updatedIssues: result.updatedIssues,
            hasErrors: !!result.errors,
            errorCount: result.errors ? result.errors.length : 0,
          },
          null,
          2
        )
      );
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(`Unhandled exception: ${error.message}`);
      process.exit(1);
    });
}
