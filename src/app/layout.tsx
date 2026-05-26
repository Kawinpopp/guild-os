import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "GuildOS — Community OS",
  description: "Community Operating System for Thai gamers",
  openGraph: {
    title: "GuildOS — Community OS",
    description: "Community Operating System for Thai gamers",
    type: "website",
    images: [
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/539508dd-c87f-4f9b-ae69-46233456c738/id-preview-d3bcf57b--8f9741d4-0ebd-4d1b-a7cc-d18b9fefb39c.lovable.app-1779416683276.png",
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GuildOS — Community OS",
    description: "Community Operating System for Thai gamers",
    images: [
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/539508dd-c87f-4f9b-ae69-46233456c738/id-preview-d3bcf57b--8f9741d4-0ebd-4d1b-a7cc-d18b9fefb39c.lovable.app-1779416683276.png",
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
