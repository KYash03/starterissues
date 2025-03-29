export default function WelcomeBanner() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div
        className="rounded-xl overflow-hidden border shadow-sm"
        style={{
          borderColor: "var(--border-card)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <div
          className="p-5 sm:p-6"
          style={{
            background:
              "linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%)",
          }}
        >
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <h2
                className="text-lg font-semibold mb-2.5"
                style={{ color: "var(--text-primary)" }}
              >
                Find beginner-friendly GitHub issues
              </h2>
              <div className="space-y-2">
                <div className="flex items-start">
                  <svg
                    className="w-3.5 h-3.5 mt-0.5 mr-2 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: "var(--text-link)" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Filter projects by language, stars, and labels
                  </p>
                </div>
                <div className="flex items-start">
                  <svg
                    className="w-3.5 h-3.5 mt-0.5 mr-2 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: "var(--text-link)" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    New issues added every 6 hours
                  </p>
                </div>
              </div>
            </div>
            <div className="self-start sm:self-center mt-2 sm:mt-0">
              <a
                href="https://opensource.guide/how-to-contribute/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                style={{
                  backgroundColor: "var(--element-active)",
                  color: "white",
                }}
              >
                Contribution Guide
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
