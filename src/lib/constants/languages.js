const LANGUAGE_POPULARITY_RANK = {
  JavaScript: 1,
  Python: 2,
  Java: 3,
  TypeScript: 4,
  "C#": 5,
  "C++": 6,
  PHP: 7,
  C: 8,
  Go: 9,
  Ruby: 10,
  Swift: 11,
  Kotlin: 12,
  Rust: 13,
  Dart: 14,
  Scala: 15,
  R: 16,
  Shell: 17,
  HTML: 18,
  CSS: 19,
  Vue: 20,
  React: 21,
  Angular: 22,
  Haskell: 23,
  Elixir: 24,
  Clojure: 25,
  "Objective-C": 26,
  Perl: 27,
  Lua: 28,
  Julia: 29,
  MATLAB: 30,
  COBOL: 31,
  Assembly: 32,
  Groovy: 33,
  PowerShell: 34,
  Fortran: 35,
};

function sortLanguagesByPopularity(languages) {
  if (!Array.isArray(languages) || languages.length === 0) return [];

  return [...languages].sort((a, b) => {
    const rankA = LANGUAGE_POPULARITY_RANK[a] ?? Number.MAX_SAFE_INTEGER;
    const rankB = LANGUAGE_POPULARITY_RANK[b] ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });
}

module.exports = { sortLanguagesByPopularity };
