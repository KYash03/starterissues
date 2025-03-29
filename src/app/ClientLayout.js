"use client";
import { useEffect } from "react";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import { AppProvider } from "@/context/AppContext";

export default function ClientLayout({ children }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <AppProvider>
      <main style={{ color: "var(--text-primary)" }}>
        {children}
        <ScrollToTopButton />
      </main>
    </AppProvider>
  );
}
