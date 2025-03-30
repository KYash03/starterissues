"use client";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import Footer from "@/components/layout/Footer";
import { AppProvider } from "@/context/AppContext";

export default function ClientLayout({ children }) {
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
