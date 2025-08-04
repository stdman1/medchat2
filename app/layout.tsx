import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedChat AI - Tư vấn Y tế Thông minh",
  description: "AI-powered medical consultation assistant with Ocean Theme",
  keywords: "medical consultation, AI chatbot, healthcare, telemedicine",
  authors: [{ name: "MedChat AI Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <link 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" 
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${GeistSans.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}