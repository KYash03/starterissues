import { useState, useEffect } from "react";
import { Icon } from "./Icons";

export default function ScrollToTopButton({ heightThreshold = 1000 }) {
  const [isVisible, setIsVisible] = useState(false);
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight;
      setIsVisible(
        scrollTop > heightThreshold ||
          (documentHeight > heightThreshold * 2 &&
            scrollTop > heightThreshold * 0.1)
      );
    };
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [heightThreshold]);
  const buttonClasses = `
    cursor-pointer fixed right-6 bottom-6 z-40 flex items-center justify-center
    h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700
    text-white shadow-lg scroll-to-top-button
    transition-all duration-200 ease-in-out
    ${
      !isVisible
        ? "opacity-0 pointer-events-none translate-y-4"
        : "opacity-100 translate-y-0"
    }
  `;
  return (
    <button
      onClick={scrollToTop}
      className={buttonClasses}
      aria-label="Scroll to top"
    >
      <Icon name="scrollTop" className="h-6 w-6" />
    </button>
  );
}
