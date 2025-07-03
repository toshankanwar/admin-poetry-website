import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Dashboard | PoemSites",
  description: "PoemSites - Discover and submit beautiful poems",
  openGraph: {
    title: "Dashboard | PoemSites",
    description: "PoemSites - Discover and submit beautiful poems",
    url: "https://admin.poems.toshankanwar.website",
    type: "website",
   
  },
  twitter: {
    card: "summary_large_image",
    title: "Dashboard | PoemSites",
    description: "PoemSites - Discover and submit beautiful poems",
    
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Dashboard | PoemSites</title>
        <meta name="description" content="PoemSites - Discover and submit beautiful poems" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:site_name" content="Dashboard | Poemsite"/>
        <meta property="og:title" content="Dashboard | PoemSites" />
        <meta property="og:description" content="PoemSites - Discover and submit beautiful poems" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://admin.poems.toshankanwar.website" />
       
        
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}