import React from "react";

export default function Footer() {
  return (
    <footer className="pb-5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="border-t pt-5"
          style={{ borderColor: "var(--border-card)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Made with
              <svg
                className="w-3 h-3 inline-block mx-1"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ color: "var(--element-active)" }}
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </span>

            <a
              href="https://github.com/KYash03/starterissues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center"
              style={{ color: "var(--text-muted)" }}
            >
              <svg
                className="w-3 h-3 mr-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              <span className="hover-text-primary">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
