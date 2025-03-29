import { useState, useRef, useMemo, useEffect } from "react";
import { Icon } from "../ui/Icons";
import { classNames, filterOptionsBySearch } from "@/lib/utils/app-utils";
import { useClickOutside } from "@/hooks/useClickOutside";

const getSortButtonClass = (option) =>
  classNames(
    "w-full text-left px-4 py-2.5 flex justify-between items-center text-sm cursor-pointer",
    option.isActive
      ? "bg-indigo-600/15 border-l-2 border-indigo-500"
      : "border-l-2 border-transparent hover:bg-[var(--bg-card-hover)]"
  );

const getSortButtonStyle = (option) => ({
  color: "var(--text-secondary)",
  ...(option.isActive && { color: "var(--text-link)" }),
});

const getSortIndicator = (option) => {
  if (option.direction) {
    return (
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600/20">
        <span
          className="text-sm font-bold"
          style={{ color: "var(--text-link)" }}
        >
          {option.direction === "desc" ? "↓" : "↑"}
        </span>
      </div>
    );
  }
  if (option.isActive) {
    return (
      <Icon
        name="check"
        className="w-4 h-4"
        style={{ color: "var(--text-link)" }}
      />
    );
  }
  return null;
};

const getMultiButtonClass = (option, isSelected, mode) =>
  classNames(
    "inline-flex items-center text-xs font-medium px-1.5 py-1 rounded-md cursor-pointer",
    option.isActive || isSelected
      ? mode === "include"
        ? "bg-indigo-600/20 border border-indigo-500/30"
        : "bg-red-600/20 border border-red-500/30"
      : "border hover:border-indigo-500/30",
    "border-[var(--border-card)]"
  );

const getMultiButtonStyle = (isSelected, mode) => ({
  color: "var(--text-secondary)",
  ...(isSelected && {
    color: mode === "include" ? "var(--text-link)" : "var(--text-danger)",
  }),
});

const CheckIcon = ({ mode }) => (
  <Icon
    name="check"
    className="w-3 h-3 mr-1"
    style={{
      color: mode === "include" ? "var(--text-link)" : "var(--text-danger)",
    }}
  />
);

const FilterOption = ({
  option,
  isSelected,
  onClick,
  type,
  mode = "include",
}) => {
  if (type !== "multi") {
    return (
      <button
        className={getSortButtonClass(option)}
        onClick={onClick}
        style={getSortButtonStyle(option)}
      >
        <span>{option.label}</span>
        {getSortIndicator(option)}
      </button>
    );
  }

  return (
    <button
      className={getMultiButtonClass(option, isSelected, mode)}
      onClick={onClick}
      style={getMultiButtonStyle(isSelected, mode)}
      title={option.label}
    >
      {isSelected && <CheckIcon mode={mode} />}
      <span className="truncate max-w-32">{option.label}</span>
    </button>
  );
};

export function Filter({
  label,
  icon,
  isActive,
  options = [],
  selectedItems = [],
  includeItems = [],
  excludeItems = [],
  onSelect,
  onSelectionChange,
  onIncludeChange,
  onExcludeChange,
  type = "single",
  customContent = null,
  isLoading = false,
  className = "",
  multiMode = false,
}) {
  const [filterState, setFilterState] = useState({
    isOpen: false,
    searchQuery: "",
    mode: "include",
  });

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const preventFocusLoss = useRef(false);

  const { isOpen, searchQuery, mode } = filterState;

  const totalSelected = multiMode
    ? includeItems.length + excludeItems.length
    : selectedItems.length;

  const hasExcludes = multiMode && excludeItems.length > 0;

  const displayLabel =
    multiMode && totalSelected > 0
      ? `${label} (+${includeItems.length}${
          hasExcludes ? `, -${excludeItems.length}` : ""
        })`
      : label;

  useEffect(() => {
    if (!isOpen && searchQuery !== "") {
      setFilterState((prev) => ({ ...prev, searchQuery: "", mode: "include" }));
    }
  }, [isOpen, searchQuery]);

  useClickOutside(
    dropdownRef,
    () => setFilterState((prev) => ({ ...prev, isOpen: false })),
    isOpen
  );

  const filteredOptions = useMemo(() => {
    if (!isOpen || isLoading) return [];

    let selected = selectedItems;
    let otherModeItems = [];
    let filteredOpts = [...options];

    if (multiMode) {
      selected = mode === "include" ? includeItems : excludeItems;
      otherModeItems = mode === "include" ? excludeItems : includeItems;
      filteredOpts = filteredOpts.filter(
        (option) => !otherModeItems.includes(option.value)
      );
    }

    return filterOptionsBySearch(filteredOpts, searchQuery, selected);
  }, [
    isOpen,
    isLoading,
    options,
    searchQuery,
    selectedItems,
    includeItems,
    excludeItems,
    mode,
    multiMode,
  ]);

  const toggleDropdown = () =>
    setFilterState((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
      ...(!prev.isOpen && { mode: "include" }),
    }));

  const handleModeChange = (newMode) => {
    setFilterState((prev) => ({ ...prev, mode: newMode, searchQuery: "" }));
    preventFocusLoss.current = true;
  };

  const toggleSelection = (value) => {
    preventFocusLoss.current = true;

    if (multiMode) {
      const updateFunction =
        mode === "include" ? onIncludeChange : onExcludeChange;
      const currentItems = mode === "include" ? includeItems : excludeItems;

      updateFunction(
        currentItems.includes(value)
          ? currentItems.filter((item) => item !== value)
          : [...currentItems, value]
      );
    } else {
      onSelectionChange(
        selectedItems.includes(value)
          ? selectedItems.filter((item) => item !== value)
          : [...selectedItems, value]
      );
    }
  };

  const handleSingleSelect = (value) => {
    onSelect?.(value);
    setFilterState((prev) => ({ ...prev, isOpen: false }));
  };

  const clearSelections = (e) => {
    e.preventDefault();
    e.stopPropagation();
    preventFocusLoss.current = true;

    if (multiMode) {
      mode === "include" ? onIncludeChange([]) : onExcludeChange([]);
    } else {
      onSelectionChange([]);
    }
  };

  const handleInputChange = (e) => {
    e.stopPropagation();
    preventFocusLoss.current = true;
    setFilterState((prev) => ({ ...prev, searchQuery: e.target.value }));
  };

  const buttonClass = classNames(
    "filter-button w-full h-10 flex items-center px-3 py-2 rounded-md text-sm font-medium cursor-pointer",
    isActive ? "filter-button-active" : "",
    multiMode && excludeItems.length > 0 ? "filter-button-with-excludes" : "",
    className
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        id={`filter-button-${label.replace(/\s+/g, "-").toLowerCase()}`}
        className={buttonClass}
        onClick={type === "button" ? onSelect : toggleDropdown}
        aria-pressed={type === "button" ? isActive : undefined}
        aria-expanded={type !== "button" ? isOpen : undefined}
        aria-haspopup={type !== "button" ? "menu" : undefined}
        style={{
          color: "var(--text-primary)",
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-card)",
        }}
      >
        <div className="flex items-center overflow-hidden">
          {icon && <span className="mr-1.5 flex-shrink-0">{icon}</span>}
          <span className="truncate">{displayLabel}</span>
        </div>
        {type !== "button" && (
          <svg
            className="w-4 h-4 ml-2 flex-shrink-0"
            style={{
              transform: isOpen ? "rotate(180deg)" : "none",
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute z-30 mt-1 w-full min-w-60 rounded-md shadow-lg overflow-hidden dropdown-animate"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-card)",
          }}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={`filter-button-${label
            .replace(/\s+/g, "-")
            .toLowerCase()}`}
        >
          {customContent ? (
            typeof customContent === "function" ? (
              customContent({
                closeDropdown: () =>
                  setFilterState((prev) => ({ ...prev, isOpen: false })),
              })
            ) : (
              customContent
            )
          ) : (
            <>
              {multiMode && (
                <div
                  className="flex w-full bg-[var(--bg-card)]"
                  style={{ borderBottom: "1px solid var(--border-card)" }}
                >
                  <button
                    className={`flex-1 text-center py-2 text-sm font-medium cursor-pointer ${
                      mode === "include" ? "border-b-2" : "hover-text-primary"
                    }`}
                    onClick={() => handleModeChange("include")}
                    style={
                      mode === "include"
                        ? {
                            color: "var(--text-link)",
                            backgroundColor: "var(--bg-card-hover)",
                            borderColor: "var(--text-link)",
                          }
                        : { color: "var(--text-secondary)" }
                    }
                  >
                    Include
                  </button>
                  <button
                    className={`flex-1 text-center py-2 text-sm font-medium cursor-pointer ${
                      mode === "exclude" ? "border-b-2" : ""
                    }`}
                    onClick={() => handleModeChange("exclude")}
                    style={
                      mode === "exclude"
                        ? {
                            color: "var(--text-danger)",
                            backgroundColor: "var(--bg-card-hover)",
                            borderColor: "var(--text-danger)",
                          }
                        : { color: "var(--text-secondary)" }
                    }
                  >
                    Exclude
                  </button>
                </div>
              )}

              {type === "multi" && (
                <div
                  className="p-3 sticky top-0 z-10"
                  style={{
                    borderBottom: "1px solid var(--border-card)",
                    backgroundColor: "var(--bg-card)",
                  }}
                >
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icon
                        name="search"
                        className="h-4 w-4"
                        style={{ color: "var(--text-secondary)" }}
                      />
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 rounded-md leading-5 text-sm"
                      style={{
                        backgroundColor: "var(--bg-card-hover)",
                        borderColor: "var(--border-card)",
                        color: "var(--text-primary)",
                      }}
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={handleInputChange}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setFilterState((prev) => ({
                            ...prev,
                            isOpen: false,
                          }));
                        }
                      }}
                      autoComplete="off"
                    />
                    {searchQuery && (
                      <button
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFilterState((prev) => ({
                            ...prev,
                            searchQuery: "",
                          }));
                          preventFocusLoss.current = true;
                          setTimeout(() => {
                            if (inputRef.current) inputRef.current.focus();
                          }, 0);
                        }}
                        aria-label="Clear search"
                        type="button"
                      >
                        <Icon
                          name="close"
                          className="h-4 w-4 hover-text-primary"
                          style={{ color: "var(--text-secondary)" }}
                        />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="dropdown-content">
                {filteredOptions.length === 0 ? (
                  <div
                    className="px-4 py-3 text-sm text-center"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No options available
                  </div>
                ) : type === "multi" ? (
                  <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto scrollbar-none p-2">
                    {filteredOptions.map((option) => (
                      <FilterOption
                        key={option.value}
                        option={option}
                        isSelected={(multiMode
                          ? mode === "include"
                            ? includeItems
                            : excludeItems
                          : selectedItems
                        ).includes(option.value)}
                        onClick={() => toggleSelection(option.value)}
                        type={type}
                        mode={mode}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-0 overflow-hidden rounded-md">
                    {filteredOptions.map((option) => (
                      <FilterOption
                        key={option.value}
                        option={option}
                        isSelected={selectedItems.includes(option.value)}
                        onClick={() => handleSingleSelect(option.value)}
                        type={type}
                        mode={mode}
                      />
                    ))}
                  </div>
                )}
              </div>

              {type === "multi" &&
                (multiMode
                  ? mode === "include"
                    ? includeItems.length > 0
                    : excludeItems.length > 0
                  : selectedItems.length > 0) && (
                  <div
                    className="p-3 flex justify-between items-center"
                    style={{
                      borderTop: "1px solid var(--border-card)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span className="text-sm">
                      {multiMode
                        ? mode === "include"
                          ? includeItems.length
                          : excludeItems.length
                        : selectedItems.length}{" "}
                      selected
                    </span>
                    <button
                      type="button"
                      className="text-sm font-medium flex items-center cursor-pointer"
                      style={{
                        color:
                          mode === "include" || !multiMode
                            ? "var(--text-link)"
                            : "var(--text-danger)",
                      }}
                      onClick={clearSelections}
                    >
                      <Icon
                        name="close"
                        className="w-3.5 h-3.5 mr-1"
                        style={{
                          color:
                            mode === "include" || !multiMode
                              ? "var(--text-link)"
                              : "var(--text-danger)",
                        }}
                      />
                      Clear all
                    </button>
                  </div>
                )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
