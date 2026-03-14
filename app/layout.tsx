import type { Metadata } from "next";
import { Space_Grotesk, Sora } from "next/font/google";
import "./globals.css";

const fontSans = Sora({
  variable: "--font-sans",
  subsets: ["latin"]
});

const fontDisplay = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Gesture Vocal Effects",
  description: "Gesture-controlled vocal synthesizer dashboard"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontDisplay.variable} bg-ink text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
