const VALID_SORT_COLUMNS = [
  "created_at",
  "updated_at",
  "comments",
  "stargazers_count",
];
const VALID_SORT_ORDERS = ["ASC", "DESC"];

const getSanitizedParams = ({
  languages,
  excludedLanguages,
  labels,
  excludedLabels,
  repositories,
  excludedRepositories,
  minStars,
  maxStars,
  bookmarkIds,
  sortBy,
  sortOrder,
  limit,
  cursor,
  cursorId,
}) => {
  if (maxStars < minStars) {
    console.warn(
      `Warning: maxStars (${maxStars}) is less than minStars (${minStars}). Adjusting maxStars to ${minStars}.`
    );
    maxStars = minStars;
  }
  return {
    languages: Array.isArray(languages) ? languages : [],
    excludedLanguages: Array.isArray(excludedLanguages)
      ? excludedLanguages
      : [],
    labels: Array.isArray(labels) ? labels : [],
    excludedLabels: Array.isArray(excludedLabels) ? excludedLabels : [],
    repositories: Array.isArray(repositories) ? repositories : [],
    excludedRepositories: Array.isArray(excludedRepositories)
      ? excludedRepositories
      : [],
    bookmarkIds: Array.isArray(bookmarkIds) ? bookmarkIds : [],
    minStars: parseInt(minStars) >= 0 ? parseInt(minStars) : 500,
    maxStars: parseInt(maxStars) >= 0 ? parseInt(maxStars) : 1000000,
    sortBy: VALID_SORT_COLUMNS.includes(sortBy) ? sortBy : "updated_at",
    sortOrder: VALID_SORT_ORDERS.includes(sortOrder?.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC",
    limit: parseInt(limit) > 0 ? parseInt(limit) : 10,
    cursor,
    cursorId: cursorId ? parseInt(cursorId) : null,
  };
};

const buildIssuesQuery = ({
  languages = [],
  excludedLanguages = [],
  labels = [],
  excludedLabels = [],
  repositories = [],
  excludedRepositories = [],
  noAssignee = true,
  minStars = 500,
  maxStars = 1000000,
  bookmarkIds = [],
  sortBy = "updated_at",
  sortOrder = "desc",
  limit = 10,
  cursor = null,
  cursorId = null,
  forCount = false,
}) => {
  const sanitizedParams = getSanitizedParams({
    languages,
    excludedLanguages,
    labels,
    excludedLabels,
    repositories,
    excludedRepositories,
    minStars,
    maxStars,
    bookmarkIds,
    sortBy,
    sortOrder,
    limit,
    cursor,
    cursorId,
  });

  const params = [sanitizedParams.minStars, sanitizedParams.maxStars];
  let paramIndex = 3;

  const selectClause = forCount
    ? `SELECT COUNT(DISTINCT i.id) AS total`
    : `SELECT
        i.id, i.github_id, i.title, i.number, i.html_url,
        i.comments, i.created_at, i.updated_at, i.assignee,
        r.full_name AS repository_name, r.html_url AS repository_url,
        r.languages AS repository_languages,
        r.stargazers_count,
        ARRAY_AGG(DISTINCT l.name) AS labels,
        ARRAY_AGG(DISTINCT l.color) AS label_colors`;

  let sql = `
    ${selectClause}
    FROM issues i
    JOIN repositories r ON i.repository_id = r.id
    ${
      forCount
        ? ""
        : `
        LEFT JOIN issue_labels il ON i.id = il.issue_id
        LEFT JOIN labels l ON il.label_id = l.id
    `
    }
    WHERE i.is_good_first_issue = TRUE
      AND i.state = 'open'
      AND r.stargazers_count >= $1
      AND r.stargazers_count <= $2
  `;

  if (noAssignee) {
    sql += ` AND (i.assignee IS NULL OR i.assignee = '')`;
  }

  if (sanitizedParams.bookmarkIds.length > 0) {
    sql += ` AND i.github_id = ANY($${paramIndex}::text[])`;
    params.push(sanitizedParams.bookmarkIds);
    paramIndex++;
  }

  if (
    !forCount &&
    sanitizedParams.cursor !== null &&
    sanitizedParams.cursorId !== null
  ) {
    const sortColumn = sanitizedParams.sortBy;
    const order = sanitizedParams.sortOrder;
    const sortTable = sortColumn === "stargazers_count" ? "r" : "i";
    const operator = order === "DESC" ? "<" : ">";

    sql += ` AND (${sortTable}.${sortColumn} ${operator} $${paramIndex} OR (${sortTable}.${sortColumn} = $${paramIndex} AND i.id ${operator} $${
      paramIndex + 1
    }))`;
    params.push(sanitizedParams.cursor, sanitizedParams.cursorId);
    paramIndex += 2;
  }

  const addArrayFiltersToWhere = (items, type, exclude = false) => {
    if (!items || items.length === 0) return;

    const conditions = [];
    items.forEach((item) => {
      if (item == null || item === "") return;

      if (type === "language") {
        conditions.push(
          `${exclude ? "NOT " : ""}($${paramIndex} = ANY(r.languages))`
        );
      } else if (type === "repository") {
        conditions.push(`r.full_name ${exclude ? "!=" : "="} $${paramIndex}`);
      }
      params.push(item);
      paramIndex++;
    });

    if (conditions.length > 0) {
      const joinOperator = exclude ? " AND " : " OR ";
      sql += ` AND (${conditions.join(joinOperator)})`;
    }
  };

  addArrayFiltersToWhere(sanitizedParams.languages, "language", false);
  addArrayFiltersToWhere(sanitizedParams.excludedLanguages, "language", true);
  addArrayFiltersToWhere(sanitizedParams.repositories, "repository", false);
  addArrayFiltersToWhere(
    sanitizedParams.excludedRepositories,
    "repository",
    true
  );

  if (sanitizedParams.labels.length > 0) {
    sanitizedParams.labels.forEach((label) => {
      if (label == null || label === "") return;
      sql += ` AND EXISTS (
        SELECT 1 FROM issue_labels il_inc
        JOIN labels l_inc ON il_inc.label_id = l_inc.id
        WHERE il_inc.issue_id = i.id AND l_inc.name = $${paramIndex}
      )`;
      params.push(label);
      paramIndex++;
    });
  }

  if (sanitizedParams.excludedLabels.length > 0) {
    sanitizedParams.excludedLabels.forEach((label) => {
      if (label == null || label === "") return;
      sql += ` AND NOT EXISTS (
        SELECT 1 FROM issue_labels il_exc
        JOIN labels l_exc ON il_exc.label_id = l_exc.id
        WHERE il_exc.issue_id = i.id AND l_exc.name = $${paramIndex}
      )`;
      params.push(label);
      paramIndex++;
    });
  }

  if (!forCount) {
    sql += ` GROUP BY i.id, r.id`;

    const sortColumn = sanitizedParams.sortBy;
    const order = sanitizedParams.sortOrder;
    const sortTable = sortColumn === "stargazers_count" ? "r" : "i";
    sql += ` ORDER BY ${sortTable}.${sortColumn} ${order}, i.id ${order}`;

    sql += ` LIMIT $${paramIndex}`;
    params.push(sanitizedParams.limit);
  }

  return { sql, params };
};

module.exports = {
  buildIssuesQuery,
};
