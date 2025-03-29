import { useState, useRef, useEffect } from "react";
import { formatDate } from "@/lib/utils/app-utils";
import { useAppContext } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const SettingsDropdown = ({ isOpen, onClose, buttonRef, onClearBookmarks }) => {
  const { theme, toggleTheme, bookmarkIds } = useAppContext();
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef &&
        !buttonRef.current.contains(event.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  const hasBookmarks = bookmarkIds.length > 0;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-1 w-52 rounded-md shadow-lg overflow-hidden border z-50 dropdown-animate"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-card)",
      }}
    >
      <div className="py-0.5">
        <h3
          className="px-3 py-1.5 text-xs font-semibold"
          style={{ color: "var(--text-muted)" }}
        >
          SETTINGS
        </h3>
        <button
          onClick={toggleTheme}
          className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-card-hover)] flex items-center cursor-pointer"
          style={{ color: "var(--text-primary)" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 mr-2 flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}
          >
            <path
              d={
                theme === "dark"
                  ? "M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"
                  : "M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
              }
            />
          </svg>
          {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        </button>
        <div
          className="border-t my-0.5"
          style={{ borderColor: "var(--border-card)" }}
        ></div>
        <button
          onClick={() => {
            if (hasBookmarks) {
              onClearBookmarks();
              onClose();
            }
          }}
          disabled={!hasBookmarks}
          className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-card-hover)] flex items-center justify-between"
          style={{
            color: hasBookmarks ? "var(--text-danger)" : "var(--text-muted)",
            cursor: hasBookmarks ? "pointer" : "not-allowed",
          }}
        >
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4 mr-2 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            Clear All Bookmarks
          </div>
        </button>
      </div>
    </div>
  );
};

export default function Header() {
  const { lastUpdated, isDataLoading, clearAllBookmarks, bookmarkIds } =
    useAppContext();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const settingsButtonRef = useRef(null);

  const toggleSettings = () => setSettingsOpen(!settingsOpen);

  const handleClearBookmarks = () => {
    setShowConfirmModal(true);
  };

  const confirmClearBookmarks = async () => {
    setIsConfirming(true);
    try {
      await clearAllBookmarks();
    } finally {
      setIsConfirming(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <>
      <header
        style={{
          background: "var(--header-bg)",
          borderColor: "var(--border-color)",
        }}
        className="fixed top-0 left-0 right-0 w-full z-50 border-b shadow-md"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center mr-3 shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">
                  <span className="text-indigo-500 font-extrabold">
                    Starter
                  </span>
                  <span style={{ color: "var(--text-primary)" }}>Issues</span>
                </h1>
                {lastUpdated && (
                  <div
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Last updated: {formatDate(lastUpdated)}
                  </div>
                )}
                {isDataLoading && (
                  <div
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Loading update status...
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <div className="relative">
                <button
                  ref={settingsButtonRef}
                  className="rounded-md p-2 hover:bg-[var(--bg-card-hover)] cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                  onClick={toggleSettings}
                  aria-expanded={settingsOpen}
                  aria-label="Settings"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
                <SettingsDropdown
                  isOpen={settingsOpen}
                  onClose={() => setSettingsOpen(false)}
                  buttonRef={settingsButtonRef}
                  onClearBookmarks={handleClearBookmarks}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => !isConfirming && setShowConfirmModal(false)}
      >
        <div className="w-full max-w-sm">
          <div className="p-2">
            <h3
              className="text-base font-semibold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Clear all bookmarks
            </h3>

            <p
              className="text-sm mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              You're about to remove {bookmarkIds.length} bookmarked{" "}
              {bookmarkIds.length === 1 ? "issue" : "issues"}. This action
              cannot be undone.
            </p>

            <div
              className="flex justify-end gap-3 pt-3"
              style={{ borderTop: "1px solid var(--border-card)" }}
            >
              <button
                onClick={() => !isConfirming && setShowConfirmModal(false)}
                disabled={isConfirming}
                className="px-3 py-1.5 rounded text-sm font-medium cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmClearBookmarks}
                disabled={isConfirming}
                className="px-3 py-1.5 rounded text-sm font-medium cursor-pointer"
                style={{
                  backgroundColor: "var(--text-danger)",
                  color: "white",
                  opacity: isConfirming ? 0.7 : 1,
                }}
              >
                {isConfirming ? "Clearing..." : "Clear All"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
