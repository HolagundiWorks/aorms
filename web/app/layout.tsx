import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "AORMS — Office Management System",
  description: "Office management system for architecture practices.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
