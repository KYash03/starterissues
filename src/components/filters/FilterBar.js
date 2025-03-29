import { useState } from "react";
import { Icon } from "../ui/Icons";
import { Filter } from "./Filter";
import StarFilterContent from "./StarFilterContent";
import { STAR_FILTERS } from "@/lib/constants/app";
import { getStarsFilterLabel } from "@/lib/utils/app-utils";
import { useFilterOptions, sortOptions } from "@/hooks/useFilterOptions";

const FilterOptions = ({ config, handlers }) => (
  <div
    id="filter-container"
    className={`${
      config.isExpanded ? "flex" : "hidden md:flex"
    } flex-col md:flex-row md:flex-wrap gap-2`}
  >
    <div className="w-full md:w-auto">
      <Filter
        label={`${
          sortOptions.find((o) => o.value === config.filters.sortBy)?.label ||
          "Updated"
        } (${config.filters.sortOrder === "desc" ? "Desc" : "Asc"})`}
        options={sortOptions.map((option) => ({
          value: option.value,
          label: option.label,
          isActive: option.value === config.filters.sortBy,
          direction:
            config.filters.sortBy === option.value
              ? config.filters.sortOrder
              : null,
        }))}
        onSelect={handlers.handleSortChange}
        icon={<Icon name="sort" className="w-4 h-4 mr-1.5" />}
        className="cursor-pointer"
      />
    </div>

    <div className="w-full md:w-auto">
      <Filter
        label="Languages"
        options={config.filterOptions.languages.map((lang) => ({
          value: lang,
          label: lang,
        }))}
        includeItems={config.filters.languages || []}
        excludeItems={config.filters.excludedLanguages || []}
        onIncludeChange={(selected) =>
          handlers.handleSelectionChange("languages", selected)
        }
        onExcludeChange={(selected) =>
          handlers.handleExclusionChange("excludedLanguages", selected)
        }
        icon={<Icon name="code" className="w-4 h-4 mr-1.5" />}
        isLoading={config.isLoading}
        type="multi"
        multiMode={true}
        className="cursor-pointer"
      />
    </div>

    <div className="w-full md:w-auto">
      <Filter
        label="Labels"
        options={config.filterOptions.labels.map((label) => ({
          value: label,
          label: label,
        }))}
        includeItems={config.filters.labels || []}
        excludeItems={config.filters.excludedLabels || []}
        onIncludeChange={(selected) =>
          handlers.handleSelectionChange("labels", selected)
        }
        onExcludeChange={(selected) =>
          handlers.handleExclusionChange("excludedLabels", selected)
        }
        icon={<Icon name="label" className="w-4 h-4 mr-1.5" />}
        isLoading={config.isLoading}
        type="multi"
        multiMode={true}
        className="cursor-pointer"
      />
    </div>

    <div className="w-full md:w-auto">
      <Filter
        label="Repositories"
        options={config.filterOptions.repositories.map((repo) => ({
          value: repo,
          label: repo,
        }))}
        includeItems={config.filters.repositories || []}
        excludeItems={config.filters.excludedRepositories || []}
        onIncludeChange={(selected) =>
          handlers.handleSelectionChange("repositories", selected)
        }
        onExcludeChange={(selected) =>
          handlers.handleExclusionChange("excludedRepositories", selected)
        }
        icon={<Icon name="repository" className="w-4 h-4 mr-1.5" />}
        isLoading={config.isLoading}
        type="multi"
        multiMode={true}
        className="cursor-pointer"
      />
    </div>

    <div className="w-full md:w-auto">
      <Filter
        label={getStarsFilterLabel(
          config.filters.minStars,
          config.filters.maxStars
        )}
        type="single"
        icon={<Icon name="star" className="w-4 h-4 mr-1.5" />}
        customContent={({ closeDropdown }) => (
          <StarFilterContent
            minStars={config.filters.minStars}
            maxStars={config.filters.maxStars}
            onApply={(min, max) => {
              handlers.onStarFilterApply(min, max);
              closeDropdown();
            }}
            onReset={() => {
              handlers.onStarFilterReset();
              closeDropdown();
            }}
            onCancel={closeDropdown}
          />
        )}
        className="cursor-pointer"
      />
    </div>

    <div className="w-full md:w-auto">
      <Filter
        label="Unassigned"
        icon={<Icon name="user" className="w-4 h-4 mr-1.5" />}
        isActive={config.filters.noAssignee}
        onSelect={handlers.toggleUnassigned}
        type="button"
        className="cursor-pointer"
      />
    </div>

    <div className="w-full md:w-auto">
      <Filter
        label="Bookmarked"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={config.filters.bookmarkedOnly ? "currentColor" : "none"}
            stroke="currentColor"
            className="w-4 h-4 mr-1.5"
            style={{
              color: config.filters.bookmarkedOnly
                ? "var(--text-warning)"
                : "currentColor",
              strokeWidth: config.filters.bookmarkedOnly ? 0 : 2,
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        }
        isActive={config.filters.bookmarkedOnly}
        onSelect={handlers.toggleBookmarked}
        type="button"
        className="cursor-pointer"
      />
    </div>
  </div>
);

export default function FilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  activeFilterCount,
}) {
  const { filterOptions, isLoading } = useFilterOptions();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const handlers = {
    handleSortChange: (sortBy) => {
      if (sortBy === filters.sortBy) {
        onFilterChange({
          sortBy,
          sortOrder: filters.sortOrder === "desc" ? "asc" : "desc",
        });
      } else {
        onFilterChange({ sortBy, sortOrder: "desc" });
      }
    },
    toggleUnassigned: () => {
      onFilterChange({ noAssignee: !filters.noAssignee });
    },
    toggleBookmarked: () => {
      onFilterChange({ bookmarkedOnly: !filters.bookmarkedOnly });
    },
    handleSelectionChange: (type, items) => {
      onFilterChange({ [type]: items });
    },
    handleExclusionChange: (type, items) => {
      onFilterChange({ [type]: items });
    },
    onStarFilterApply: (min, max) => {
      onFilterChange({
        minStars: min,
        maxStars: max,
      });
    },
    onStarFilterReset: () => {
      onFilterChange({
        minStars: STAR_FILTERS.DEFAULT_MIN_STARS,
        maxStars: STAR_FILTERS.DEFAULT_MAX_STARS,
      });
    },
  };

  const config = {
    isExpanded: isFilterExpanded,
    filters,
    filterOptions,
    isLoading,
  };

  return (
    <div className="mb-6 space-y-4" role="search" aria-label="Filter issues">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Filters
          </h2>
          {activeFilterCount > 0 && (
            <span className="text-indigo-500 bg-indigo-500/10 text-xs rounded-full px-2 py-0.5">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center">
          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              className="text-sm px-2 py-1 rounded mr-2 md:pl-2 md:pr-0 md:mr-0 hover-text-primary cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Reset all filters"
            >
              Reset all
            </button>
          )}
          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className="md:hidden rounded-md hover-text-primary cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
            aria-expanded={isFilterExpanded}
            aria-label="Toggle filters"
            aria-controls="filter-container"
          >
            <Icon
              name={isFilterExpanded ? "menuOpen" : "menuClosed"}
              className="h-6 w-6"
            />
          </button>
        </div>
      </div>
      <FilterOptions config={config} handlers={handlers} />
    </div>
  );
}
