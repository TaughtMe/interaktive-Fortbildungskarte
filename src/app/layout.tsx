import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schulamt Memmingen-Mindelheim · Interaktive Karte",
  description: "Interaktive Fortbildungskarte für den Schulamtsbezirk Memmingen-Mindelheim",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        {children}
      </body>
    </html>
  );
}
