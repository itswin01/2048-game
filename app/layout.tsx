import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2048",
  description: "Join the tiles, get to 2048!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
