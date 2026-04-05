import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { CKBProvider } from "@/providers/CKBProvider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GRID3 — On-Chain Tic Tac Toe",
  description:
    "Stake CKBytes. Play on-chain. A fully decentralized Tic Tac Toe game built on Nervos CKB.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "GRID3 — On-Chain Tic Tac Toe",
    description:
      "Stake CKBytes. Play on-chain. Win rewards. A fully decentralized Tic Tac Toe game on Nervos CKB.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "GRID3 — On-Chain Tic Tac Toe on CKB",
      },
    ],
    type: "website",
    siteName: "GRID3",
  },
  twitter: {
    card: "summary_large_image",
    title: "GRID3 — On-Chain Tic Tac Toe",
    description:
      "Stake CKBytes. Play on-chain. Win rewards. Built on Nervos CKB.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body className="min-h-full bg-surface text-on-surface font-body">
        <CKBProvider>{children}</CKBProvider>
      </body>
    </html>
  );
}
