const { query, transaction, updateMetadata } = require("./db-service");

const GITHUB_API_URL = "https://api.github.com";
const GH_ACCESS_TOKEN = process.env.GH_ACCESS_TOKEN;
const headers = {
  Accept: "application/vnd.github.v3+json",
  Authorization: GH_ACCESS_TOKEN ? `token ${GH_ACCESS_TOKEN}` : "",
  "User-Agent": "Good-First-Issues-App",
};

async function makeGitHubRequest(url, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const fullUrl = `${url}${queryString ? "?" + queryString : ""}`;

  const response = await fetch(fullUrl, { headers });

  if (!response.ok) {
    throw new Error(
      `GitHub API Error: ${response.status} ${await response.text()}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const fetchRepoLanguages = async (repoFullName) => {
  try {
    const languages = await makeGitHubRequest(
      `${GITHUB_API_URL}/repos/${repoFullName}/languages`,
      {}
    );
    return languages ? Object.keys(languages) : [];
  } catch (error) {
    console.error(
      `Error fetching languages for ${repoFullName}: ${error.message}`
    );
    return [];
  }
};

async function processBatch(items, processor) {
  const results = { processed: 0, errors: [], updatedCount: 0 };
  const batchSize = 5;

  for (let i = 0; i < items.length; i += batchSize) {
    const batchItems = items.slice(i, i + batchSize);

    const batchPromises = batchItems.map(async (item) => {
      try {
        await processor(item);
        return {
          success: true,
          id: item.id || item.github_id || "unknown",
          updated: true,
        };
      } catch (error) {
        return {
          success: false,
          id: item.id || item.github_id || "unknown",
          error: error.message,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      if (result.success) {
        results.processed++;
        if (result.updated) {
          results.updatedCount++;
        }
      } else {
        results.errors.push({
          id: result.id,
          error: result.error,
        });
      }
    }

    if (i + batchSize < items.length) {
      await sleep(50);
    }
  }

  return results;
}

async function finishOperation(stats) {
  const status = stats.errors.length > 0 ? "completed_with_errors" : "success";

  try {
    await updateMetadata(
      status,
      stats.errors.length > 0 ? JSON.stringify(stats.errors) : null
    );
  } catch (dbError) {
    console.error("Failed to update metadata:", dbError);
  }

  return {
    success: status === "success",
    count: stats.processed,
    updatedCount: stats.updatedCount || 0,
    ...(stats.errors.length > 0 && { errors: stats.errors }),
  };
}

const searchIssues = (params) => {
  const actualParams = {
    ...params,
    per_page: Math.min(params.per_page || 100, 100),
  };
  return makeGitHubRequest(`${GITHUB_API_URL}/search/issues`, actualParams);
};

const fetchRepository = (repoUrl) => {
  return makeGitHubRequest(repoUrl, {});
};

async function saveData(repoData, languages, issueData = null, retryCount = 0) {
  if (!repoData || !repoData.id || !repoData.full_name) {
    throw new Error("Invalid repoData provided to saveData");
  }
  if (issueData && (!issueData.id || !issueData.repository_url)) {
    throw new Error("Invalid issueData provided to saveData");
  }

  try {
    return await transaction(async (client) => {
      const repoGitHubId = String(repoData.id);
      const issueGitHubId = issueData ? String(issueData.id) : null;

      const {
        rows: [{ id: repoId }],
      } = await client.query(
        `INSERT INTO repositories (
           github_id, name, full_name, html_url,
           stargazers_count, forks_count, watchers_count, language, languages,
           created_at, updated_at, last_refreshed
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (github_id) DO UPDATE SET
           name = EXCLUDED.name, full_name = EXCLUDED.full_name, html_url = EXCLUDED.html_url,
           stargazers_count = EXCLUDED.stargazers_count, forks_count = EXCLUDED.forks_count,
           watchers_count = EXCLUDED.watchers_count, language = EXCLUDED.language,
           languages = EXCLUDED.languages, updated_at = EXCLUDED.updated_at,
           last_refreshed = NOW()
         RETURNING id`,
        [
          repoGitHubId,
          repoData.name,
          repoData.full_name,
          repoData.html_url,
          repoData.stargazers_count || 0,
          repoData.forks_count || 0,
          repoData.watchers_count || 0,
          repoData.language,
          languages || [],
          repoData.created_at,
          repoData.updated_at,
        ]
      );

      if (!issueData || !issueGitHubId) return repoId;

      const assigneeLogin = issueData.assignee
        ? issueData.assignee.login
        : null;

      const {
        rows: [{ id: issueId }],
      } = await client.query(
        `INSERT INTO issues (
           github_id, repository_id, title, number, html_url,
           state, comments, created_at, updated_at, assignee,
           is_good_first_issue, last_refreshed
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW())
         ON CONFLICT (github_id) DO UPDATE SET
           title = EXCLUDED.title, state = EXCLUDED.state, comments = EXCLUDED.comments,
           updated_at = EXCLUDED.updated_at, assignee = EXCLUDED.assignee,
           is_good_first_issue = true, last_refreshed = NOW()
         RETURNING id`,
        [
          issueGitHubId,
          repoId,
          issueData.title,
          issueData.number,
          issueData.html_url,
          issueData.state,
          issueData.comments || 0,
          issueData.created_at,
          issueData.updated_at,
          assigneeLogin,
        ]
      );

      if (issueData.labels && issueData.labels.length > 0) {
        await client.query("DELETE FROM issue_labels WHERE issue_id = $1", [
          issueId,
        ]);

        for (const label of issueData.labels) {
          if (!label.name) continue;

          const {
            rows: [{ id: labelId }],
          } = await client.query(
            `INSERT INTO labels (name, color)
             VALUES ($1, $2)
             ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
             RETURNING id`,
            [label.name, label.color || "8957e5"]
          );

          await client.query(
            "INSERT INTO issue_labels (issue_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [issueId, labelId]
          );
        }
      } else {
        await client.query("DELETE FROM issue_labels WHERE issue_id = $1", [
          issueId,
        ]);
      }

      return issueId;
    });
  } catch (error) {
    if (error.message.includes("deadlock detected") && retryCount < 3) {
      console.warn(
        `Deadlock detected, retrying (attempt ${retryCount + 1}) for repo: ${
          repoData.full_name
        }`
      );
      await sleep(500 * Math.pow(2, retryCount));
      return saveData(repoData, languages, issueData, retryCount + 1);
    }
    console.error(
      `Error in saveData for repo ${repoData.full_name}: ${error.message}`
    );
    throw error;
  }
}

async function executeGitHubOperation(operationName, operation) {
  console.log(`Starting operation: ${operationName}`);
  try {
    await updateMetadata(operationName);
    const result = await operation();
    console.log(
      `Finished operation: ${operationName}. Processed: ${result.processed}, Errors: ${result.errors.length}`
    );
    return await finishOperation(result);
  } catch (error) {
    console.error(
      `Operation ${operationName} failed critically: ${error.message}`,
      error.stack
    );
    try {
      await updateMetadata("error", error.message);
    } catch (metaError) {
      console.error("Failed to update metadata:", metaError);
    }
    return {
      success: false,
      error: error.message,
      count: 0,
      updatedCount: 0,
      errors: [],
    };
  }
}

async function refreshExistingIssues(ageInDays = 2, batchSizeParam = 30) {
  const dbFetchLimit = Math.max(10, batchSizeParam);

  return executeGitHubOperation("refreshing_existing", async () => {
    const { rows: staleIssues } = await query(`
      SELECT i.id, i.github_id, i.html_url, r.full_name as repo_full_name
      FROM issues i
      JOIN repositories r ON i.repository_id = r.id
      WHERE i.is_good_first_issue = TRUE AND i.state = 'open'
      AND (i.last_refreshed IS NULL OR i.last_refreshed < NOW() - INTERVAL '${Number(
        ageInDays
      )} days')
      ORDER BY i.updated_at ASC
      LIMIT ${Number(dbFetchLimit)}
    `);

    if (staleIssues.length === 0) {
      console.log("No stale issues found to refresh.");
      return { processed: 0, errors: [], updatedCount: 0 };
    }

    console.log(`Found ${staleIssues.length} stale issues to refresh.`);

    return processBatch(staleIssues, async (issue) => {
      const repoFullName = issue.repo_full_name;
      const issueNumber = issue.html_url.split("/").pop();

      const [issueData, repoData] = await Promise.all([
        makeGitHubRequest(
          `${GITHUB_API_URL}/repos/${repoFullName}/issues/${issueNumber}`
        ).catch((err) => {
          throw new Error(
            `Failed to fetch issue ${repoFullName}#${issueNumber}: ${err.message}`
          );
        }),
        makeGitHubRequest(`${GITHUB_API_URL}/repos/${repoFullName}`).catch(
          (err) => {
            throw new Error(
              `Failed to fetch repo ${repoFullName}: ${err.message}`
            );
          }
        ),
      ]);

      if (!issueData || !repoData) {
        console.warn(
          `Issue ${repoFullName}#${issueNumber} or repo ${repoFullName} not found or inaccessible. Skipping.`
        );
        throw new Error(
          `Issue or repo not found/inaccessible (API returned null/404)`
        );
      }

      const languages = await fetchRepoLanguages(repoData.full_name);

      await saveData(repoData, languages, issueData);
    });
  });
}

async function refreshGitHubData() {
  const MAX_ITEMS_OVERALL = 1000;
  const MAX_PAGES = 10;
  const MIN_STARS = 500;

  return executeGitHubOperation("refreshing", async () => {
    try {
      await transaction((client) =>
        client.query(
          `UPDATE issues SET is_good_first_issue = FALSE WHERE state != 'open' AND is_good_first_issue = TRUE`
        )
      );
      console.log("Marked non-open issues as not 'good first issue'.");
    } catch (cleanupError) {
      console.error("Error during initial issue cleanup:", cleanupError);
    }

    const stats = { processed: 0, errors: [], updatedCount: 0 };
    const processedIssueIds = new Set();
    const searchQuery = 'label:"good first issue" state:open';

    for (
      let page = 1;
      page <= MAX_PAGES && stats.processed < MAX_ITEMS_OVERALL;
      page++
    ) {
      console.log(`Fetching page ${page} of search results...`);
      try {
        const searchResult = await searchIssues({
          q: searchQuery,
          sort: "updated",
          order: "desc",
          per_page: 100,
          page,
        });

        const issues = searchResult?.items;
        if (!issues || issues.length === 0) {
          console.log(`No more issues found on page ${page}.`);
          break;
        }
        console.log(
          `Found ${issues.length} issues on page ${page}. Total possible: ${searchResult.total_count}`
        );

        const issuesToProcess = [];
        const repoUrlsToFetch = new Map();

        for (const issue of issues) {
          if (processedIssueIds.has(issue.id.toString())) {
            continue;
          }
          if (!repoUrlsToFetch.has(issue.repository_url)) {
            repoUrlsToFetch.set(issue.repository_url, null);
          }
          issuesToProcess.push(issue);
        }

        if (issuesToProcess.length === 0 && repoUrlsToFetch.size === 0) {
          console.log("No new issues to process on this page.");
          continue;
        }

        console.log(
          `Fetching ${repoUrlsToFetch.size} unique repositories for page ${page}...`
        );
        const repoFetchPromises = Array.from(repoUrlsToFetch.keys()).map(
          async (repoUrl) => {
            try {
              const repoData = await fetchRepository(repoUrl);
              if (repoData) {
                repoUrlsToFetch.set(repoUrl, repoData);
              } else {
                repoUrlsToFetch.delete(repoUrl);
              }
            } catch (repoError) {
              console.warn(
                `Failed to fetch repo ${repoUrl}: ${repoError.message}`
              );
              repoUrlsToFetch.delete(repoUrl);
              stats.errors.push({
                id: `repo:${repoUrl}`,
                error: `Repo fetch failed: ${repoError.message}`,
              });
            }
          }
        );
        await Promise.all(repoFetchPromises);
        console.log(
          `Fetched ${
            Array.from(repoUrlsToFetch.values()).filter(Boolean).length
          } repositories successfully.`
        );

        const finalIssuesForBatch = issuesToProcess.filter((issue) => {
          const repoData = repoUrlsToFetch.get(issue.repository_url);
          const meetsCriteria =
            repoData && repoData.stargazers_count >= MIN_STARS;
          if (meetsCriteria) {
            processedIssueIds.add(issue.id.toString());
          }

          return meetsCriteria;
        });

        if (finalIssuesForBatch.length === 0) {
          console.log(
            "No issues met the criteria after filtering on page " + page
          );
          continue;
        }

        console.log(
          `Processing batch of ${finalIssuesForBatch.length} issues for page ${page}...`
        );

        const batchResults = await processBatch(
          finalIssuesForBatch,
          async (issue) => {
            const repoData = repoUrlsToFetch.get(issue.repository_url);

            if (!repoData) {
              throw new Error(
                `Repo data missing for ${issue.repository_url} during processing`
              );
            }

            const languages = await fetchRepoLanguages(repoData.full_name);

            await saveData(repoData, languages, issue);
          }
        );

        stats.processed += batchResults.processed;
        stats.updatedCount += batchResults.updatedCount;
        stats.errors.push(...batchResults.errors);

        console.log(
          `Page ${page} processed. Total processed so far: ${stats.processed}. Errors: ${batchResults.errors.length}`
        );

        if (stats.processed >= MAX_ITEMS_OVERALL) {
          console.log(
            `Reached maximum processing limit (${MAX_ITEMS_OVERALL}). Stopping.`
          );
          break;
        }

        const maxPagesFromTotal = searchResult.total_count
          ? Math.ceil(Math.min(searchResult.total_count, 1000) / 100)
          : MAX_PAGES;
        if (page >= maxPagesFromTotal) {
          console.log("Processed all available pages based on total count.");
          break;
        }
      } catch (error) {
        console.error(
          `Error processing page ${page}: ${error.message}`,
          error.stack
        );
        stats.errors.push({ type: "page_error", page, error: error.message });
        if (error.message.includes("rate limit")) {
          console.warn(
            "Rate limit likely hit. Pausing before potential next page..."
          );
          await sleep(5000);
        }
      }
    }

    console.log(
      `Refresh GitHub data finished. Total processed: ${stats.processed}, Total updated: ${stats.updatedCount}`
    );
    return stats;
  });
}

module.exports = {
  refreshGitHubData,
  refreshExistingIssues,
};
