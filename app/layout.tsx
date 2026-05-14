import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-zilla",
  description: "Unified AI toolkit and agent command dashboard."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
