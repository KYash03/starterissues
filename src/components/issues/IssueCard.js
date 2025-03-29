import { useState, useMemo } from "react";
import { formatDate, formatNumber } from "@/lib/utils/app-utils";
import { sortLanguagesByPopularity } from "@/lib/constants/languages";
import { Icon, GitHubIcon } from "../ui/Icons";
import Card from "../ui/Card";
import Tag from "../ui/Tag";
import { useAppContext } from "@/context/AppContext";

const ExpandableTagList = ({ items, visibleCount, renderTag, label }) => {
  const [showAll, setShowAll] = useState(false);
  const visibleItems = items.slice(0, showAll ? items.length : visibleCount);
  const hasMore = items.length > visibleCount;

  return (
    <>
      {visibleItems.map((item, index) => {
        const isExpanded = false;
        return renderTag(item, index, isExpanded, {});
      })}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs cursor-pointer pr-2.5 py-0.5 hover-text-primary"
          style={{ color: "var(--text-muted)" }}
          aria-label={
            showAll
              ? `Show less ${label}`
              : `Show ${items.length - visibleCount} more ${label}`
          }
        >
          {showAll ? "Show less" : `+${items.length - visibleCount} more`}
        </button>
      )}
    </>
  );
};

export default function IssueCard({ issue }) {
  const { isBookmarked, toggleBookmark } = useAppContext();
  const bookmarked = isBookmarked(issue.github_id);

  const visibleLabelsCount = 3;
  const visibleLanguagesCount = 3;
  const {
    title,
    html_url,
    repository_name,
    repository_url,
    repository_languages = [],
    stargazers_count,
    labels = [],
    label_colors = [],
    created_at,
    updated_at,
    comments,
  } = issue;

  const sortedLanguages = useMemo(
    () => sortLanguagesByPopularity(repository_languages),
    [repository_languages]
  );

  const labelItems = useMemo(() => {
    return labels.map((label) => ({
      label,
      color: label_colors[labels.indexOf(label)] || "8957e5",
    }));
  }, [labels, label_colors]);

  return (
    <Card className="animate-scale-fade">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <h3
          className="text-base font-semibold w-full"
          style={{ color: "var(--text-primary)" }}
        >
          <a
            href={html_url}
            className="inline-block hover-text-primary rounded-md overflow-hidden"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View issue: ${title}`}
            title={title}
            style={{ overflowWrap: "anywhere" }}
          >
            {title}
          </a>
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0 sm:-mt-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleBookmark(issue);
            }}
            className="flex-shrink-0 p-1.5 rounded-full hover:bg-[var(--bg-card-hover)] cursor-pointer"
            aria-label={
              bookmarked ? "Remove from bookmarks" : "Add to bookmarks"
            }
            title={bookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={bookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              className={`w-5 h-5 bookmark-icon ${bookmarked ? "active" : ""}`}
              style={{
                color: bookmarked
                  ? "var(--text-warning)"
                  : "var(--text-secondary)",
                strokeWidth: bookmarked ? 0 : 2,
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </button>
          <a
            href={repository_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap overflow-hidden max-w-[160px] sm:max-w-[200px] md:max-w-[300px] lg:max-w-[400px]"
            style={{
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-card-hover)",
            }}
            aria-label={`View repository: ${repository_name}`}
            title={`Repository: ${repository_name}`}
          >
            <GitHubIcon className="flex-shrink-0" />
            <span className="ml-1.5 truncate">{repository_name}</span>
          </a>
        </div>
      </div>
      <div className="space-y-2">
        <div className="mb-2">
          <div className="flex items-center gap-1 mb-1.5">
            <Icon
              name="label"
              className="w-3.5 h-3.5"
              style={{ color: "var(--text-link)" }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-link)" }}
            >
              Labels
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExpandableTagList
              items={labelItems}
              visibleCount={visibleLabelsCount}
              renderTag={(item, index, shouldAnimate, delayStyle) => (
                <Tag
                  key={item.label}
                  item={item}
                  type="label"
                  shouldAnimate={shouldAnimate}
                  delayStyle={delayStyle}
                />
              )}
              label="labels"
            />
          </div>
        </div>
        <div className="mb-2">
          <div className="flex items-center gap-1 mb-1.5">
            <Icon
              name="code"
              className="w-3.5 h-3.5"
              style={{ color: "var(--text-link)" }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-link)" }}
            >
              Languages
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedLanguages.length === 0 ? (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                No languages available
              </span>
            ) : (
              <ExpandableTagList
                items={sortedLanguages}
                visibleCount={visibleLanguagesCount}
                renderTag={(language, index, shouldAnimate, delayStyle) => (
                  <Tag
                    key={language}
                    item={language}
                    type="language"
                    shouldAnimate={shouldAnimate}
                    delayStyle={delayStyle}
                  />
                )}
                label="languages"
              />
            )}
          </div>
        </div>
      </div>
      <div
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-3 pt-3 text-xs"
        style={{
          borderTop: "1px solid var(--border-color)",
          color: "var(--text-secondary)",
        }}
      >
        <div className="flex items-center space-x-3">
          <div
            className="flex items-center"
            title={`${stargazers_count} stars`}
          >
            <Icon
              name="star"
              className="w-3 h-3 mr-1"
              style={{ color: "var(--text-warning)" }}
              fill="currentColor"
            />
            <span>{formatNumber(stargazers_count)}</span>
          </div>
          {comments > 0 && (
            <div className="flex items-center" title={`${comments} comments`}>
              <Icon
                name="comment"
                className="w-3.5 h-3.5 mr-1.5 flex-shrink-0"
                style={{ color: "var(--text-info)" }}
                fill="currentColor"
              />
              <span>{comments} comments</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center"
            title={`Updated on ${new Date(updated_at).toLocaleDateString()}`}
          >
            <Icon
              name="refresh"
              className="w-3.5 h-3.5 mr-1.5 flex-shrink-0"
              style={{ color: "var(--text-info)" }}
            />
            <span>Updated {formatDate(updated_at)}</span>
          </div>
          <div
            className="flex items-center"
            title={`Created on ${new Date(created_at).toLocaleDateString()}`}
          >
            <Icon
              name="calendar"
              className="w-3.5 h-3.5 mr-1.5 flex-shrink-0"
              style={{ color: "var(--text-success)" }}
            />
            <span>Created {formatDate(created_at)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
