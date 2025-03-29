import { useState, useEffect, useRef } from "react";
import { STAR_FILTERS } from "@/lib/constants/app";
import { validateStarInputs } from "@/lib/utils/app-utils";
import { Icon } from "../ui/Icons";

export default function StarFilterContent({
  minStars,
  maxStars,
  onApply,
  onReset,
}) {
  const [starInputs, setStarInputs] = useState({
    minStars: minStars,
    maxStars: maxStars === STAR_FILTERS.DEFAULT_MAX_STARS ? "" : maxStars,
    error: null,
  });

  const minStarsRef = useRef(null);
  const maxStarsRef = useRef(null);

  useEffect(() => {
    setStarInputs({
      minStars: minStars,
      maxStars: maxStars === STAR_FILTERS.DEFAULT_MAX_STARS ? "" : maxStars,
      error: null,
    });
  }, [minStars, maxStars]);

  const handleStarInputChange = (field, value) => {
    const sanitizedValue = value !== "" ? value.replace(/[^\d]/g, "") : "";
    setStarInputs((prevInputs) => {
      const newInputs = {
        ...prevInputs,
        [field]: sanitizedValue,
      };
      return validateStarInputs(newInputs);
    });
  };

  const handleClearInput = (field) => {
    setStarInputs((prevInputs) => {
      const newInputs = {
        ...prevInputs,
        [field]: field === "minStars" ? STAR_FILTERS.DEFAULT_MIN_STARS : "",
      };
      return validateStarInputs(newInputs);
    });

    if (field === "minStars") {
      minStarsRef.current?.focus();
    } else {
      maxStarsRef.current?.focus();
    }
  };

  const handleApply = () => {
    const validatedInputs = validateStarInputs(starInputs);
    if (validatedInputs.error) {
      setStarInputs(validatedInputs);
      return;
    }

    const min = Math.max(
      parseInt(starInputs.minStars, 10) || STAR_FILTERS.DEFAULT_MIN_STARS,
      STAR_FILTERS.DEFAULT_MIN_STARS
    );

    const rawMax =
      starInputs.maxStars === ""
        ? STAR_FILTERS.DEFAULT_MAX_STARS
        : parseInt(starInputs.maxStars, 10);

    const max = isNaN(rawMax)
      ? STAR_FILTERS.DEFAULT_MAX_STARS
      : Math.max(rawMax, min);

    onApply(min, max === min ? min : max);
  };

  const hasChanged =
    parseInt(starInputs.minStars, 10) !== minStars ||
    (starInputs.maxStars === ""
      ? maxStars !== STAR_FILTERS.DEFAULT_MAX_STARS
      : parseInt(starInputs.maxStars, 10) !== maxStars);

  const isAtDefaults =
    minStars === STAR_FILTERS.DEFAULT_MIN_STARS &&
    maxStars === STAR_FILTERS.DEFAULT_MAX_STARS;

  return (
    <div className="p-3 space-y-4">
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-primary)" }}
        >
          Min Stars{" "}
          <span style={{ color: "var(--text-muted)" }} className="text-xs">
            (minimum 500)
          </span>
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full px-3 py-2 pr-8 rounded-md text-sm"
            style={{
              backgroundColor: "var(--bg-card-hover)",
              borderColor: starInputs.error
                ? "var(--text-danger)"
                : "var(--border-card)",
              color: "var(--text-primary)",
            }}
            value={starInputs.minStars}
            ref={minStarsRef}
            onChange={(e) => handleStarInputChange("minStars", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApply();
              }
            }}
          />
          {starInputs.minStars !== "" &&
            parseInt(starInputs.minStars) !==
              STAR_FILTERS.DEFAULT_MIN_STARS && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-2 flex items-center cursor-pointer"
                onClick={() => handleClearInput("minStars")}
                aria-label="Clear min stars"
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
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-primary)" }}
        >
          Max Stars
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full px-3 py-2 pr-8 rounded-md text-sm"
            style={{
              backgroundColor: "var(--bg-card-hover)",
              borderColor: starInputs.error
                ? "var(--text-danger)"
                : "var(--border-card)",
              color: "var(--text-primary)",
            }}
            value={starInputs.maxStars}
            placeholder="No limit"
            ref={maxStarsRef}
            onChange={(e) => handleStarInputChange("maxStars", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApply();
              }
            }}
          />
          {starInputs.maxStars !== "" && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-2 flex items-center cursor-pointer"
              onClick={() => handleClearInput("maxStars")}
              aria-label="Clear max stars"
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
      {starInputs.error && (
        <div
          style={{ color: "var(--text-danger)" }}
          className="text-sm font-medium"
        >
          {starInputs.error}
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onReset}
          style={{
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-card-hover)",
            opacity: isAtDefaults ? 0.5 : 1,
          }}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            isAtDefaults
              ? "cursor-not-allowed"
              : "hover-text-primary cursor-pointer"
          }`}
          disabled={isAtDefaults}
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className={`px-3 py-2 text-sm font-medium text-white rounded-md ${
            starInputs.error || !hasChanged
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
          }`}
          disabled={!!starInputs.error || !hasChanged}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
