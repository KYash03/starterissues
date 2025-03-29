"use client";
import { useEffect } from "react";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import Footer from "@/components/layout/Footer";
import { AppProvider } from "@/context/AppContext";

export default function ClientLayout({ children }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <AppProvider>
      <main style={{ color: "var(--text-primary)" }}>
        {children}
        <Footer />
        <ScrollToTopButton />
      </main>
    </AppProvider>
  );
}
