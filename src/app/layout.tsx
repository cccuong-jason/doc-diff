
import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "DocDiff - Document Comparison Tool",
  description: "Compare documents and track changes with AI-powered insights. Supports DOCX, PDF, and Excel files.",
  keywords: ["document comparison", "diff", "docx", "pdf", "excel", "AI summary"],
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="font-sans antialiased h-screen flex flex-col overflow-hidden bg-background">
        <Header />
        <div className="flex-1 overflow-hidden flex flex-col relative w-full">
          {children}
        </div>
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
