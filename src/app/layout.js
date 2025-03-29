import "./globals.css";
import ClientLayout from "./ClientLayout";
import { getInitialThemeScript } from "@/lib/utils/theme-utils";

export const metadata = {
  title: "Starter Issues",
  description:
    "Find beginner-friendly GitHub issues to contribute to open source projects.",
  keywords:
    "github, open source, good first issues, beginner-friendly, contributions",
  openGraph: {
    title: "Starter Issues",
    description:
      "Find beginner-friendly GitHub issues to contribute to open source projects.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: getInitialThemeScript(),
          }}
        />
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-KLXS165FPG"
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-KLXS165FPG');
            `,
          }}
        />
      </head>
      <body className="h-full">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
