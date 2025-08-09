// app/layout.tsx - Cập nhật metadata cho trang chủ
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedChat AI - Tư vấn Y tế Thông minh",
  description: "AI-powered medical consultation assistant with Ocean Theme",
  keywords: "medical consultation, AI chatbot, healthcare, telemedicine",
  authors: [{ name: "MedChat AI Team" }],
  
  // Open Graph cho Facebook
  openGraph: {
    title: "MedChat AI - Tư vấn Y tế Thông minh",
    description: "AI-powered medical consultation assistant with Ocean Theme",
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com',
    siteName: 'MedChat AI',
    images: [
      {
        url: '/images/og-homepage.jpg', // Tạo file ảnh này
        width: 1200,
        height: 630,
        alt: 'MedChat AI - Tư vấn Y tế Thông minh',
      }
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: "MedChat AI - Tư vấn Y tế Thông minh",
    description: "AI-powered medical consultation assistant with Ocean Theme",
    images: ['/images/og-homepage.jpg'],
  },
  
  // Other meta tags
  other: {
    // Nếu có Facebook App ID
    'fb:app_id': 'YOUR_FACEBOOK_APP_ID', // Thay bằng ID thật (không bắt buộc)
  }
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