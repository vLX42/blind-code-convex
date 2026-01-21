import type { Metadata } from "next";
import { Providers } from "./components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Blind Code",
  description: "A multiplayer coding challenge inspired by Code in the Dark. Recreate websites using HTML & CSS without seeing any preview.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-gray-950 text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
