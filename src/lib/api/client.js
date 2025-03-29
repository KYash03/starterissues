function buildQueryParams(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null) {
          searchParams.append(
            `${key}[]`,
            typeof item === "object" ? JSON.stringify(item) : item.toString()
          );
        }
      });
    } else if (value != null && typeof value !== "object") {
      searchParams.append(key, value.toString());
    }
  });

  if (params.cursor && typeof params.cursor === "object") {
    if (params.cursor.cursor != null) {
      searchParams.append("cursor", params.cursor.cursor.toString());
    }
    if (params.cursor.cursorId != null) {
      searchParams.append("cursorId", params.cursor.cursorId.toString());
    }
  }

  return searchParams;
}

module.exports = {
  buildQueryParams,
};
