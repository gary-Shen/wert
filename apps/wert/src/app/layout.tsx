import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wert",
  description: "跟踪您的净资产快照",
};

import { ThemeProvider } from "@/components/theme-provider"
import { DataSynchronizer } from "@/components/DataSynchronizer"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DataSynchronizer />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
