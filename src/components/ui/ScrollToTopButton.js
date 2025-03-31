"use client";
import { useState, useEffect, useRef } from "react";
import { Icon } from "./Icons";
export default function ScrollToTopButton({ heightThreshold = 1000 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const footerRef = useRef(null);
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
      const windowHeight = window.innerHeight;
      setIsVisible(
        scrollTop > heightThreshold ||
          (documentHeight > windowHeight &&
            scrollTop + windowHeight >= documentHeight - 100)
      );
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [heightThreshold]);
  useEffect(() => {
    const footerElement = document.querySelector("footer");
    if (!footerElement) {
      console.warn("ScrollToTopButton: Footer element not found.");
      return;
    }
    footerRef.current = footerElement;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.01,
      }
    );
    observer.observe(footerElement);
    return () => {
      if (footerElement) {
        observer.unobserve(footerElement);
      }
      observer.disconnect();
    };
  }, []);
  const bottomPositionClass = isFooterVisible ? "bottom-[72px]" : "bottom-6";
  const buttonClasses = `
    cursor-pointer fixed right-6 ${bottomPositionClass} z-40 flex items-center justify-center
    h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700
    text-white shadow-lg scroll-to-top-button
    transition-all duration-300 ease-in-out
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
