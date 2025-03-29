const STAR_FILTERS = {
  DEFAULT_MIN_STARS: 500,
  DEFAULT_MAX_STARS: 500000,
};

const getItemStyle = (item, type = "language") => {
  return {
    backgroundColor: "var(--tag-bg)",
    color: "var(--tag-text)",
    borderColor: "var(--border-card)",
    fontWeight: "400",
  };
};

module.exports = {
  STAR_FILTERS,
  getItemStyle,
};
