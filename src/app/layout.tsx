import { Outfit } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import { SidebarProvider } from "@/context/SidebarContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ProfileCheck from "@/components/onboarding/ProfileCheck";
import { Analytics } from "@vercel/analytics/next";
import { Metadata } from "next";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TM Hire - Concrete Calculator",
    template: "%s | TM Hire - Concrete Calculator"
  },
  description: "Streamline your concrete operations with TM Hire's comprehensive concrete calculator and management platform",
  keywords: ["concrete calculator", "concrete management", "construction", "concrete operations", "TM Hire"],
  authors: [{ name: "TM Hire" }],
  creator: "TM Hire",
  publisher: "TM Hire",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://tmhire.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tmhire.com",
    title: "TM Hire - Concrete Calculator",
    description: "Streamline your concrete operations with TM Hire's comprehensive concrete calculator and management platform",
    siteName: "TM Hire",
    images: [
      {
        url: "https://i.ibb.co/BV0jYxcR/image.png",
        width: 1200,
        height: 630,
        alt: "TM Hire - Concrete Calculator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TM Hire - Concrete Calculator",
    description: "Streamline your concrete operations with TM Hire's comprehensive concrete calculator and management platform",
    images: ["https://i.ibb.co/BV0jYxcR/image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <Providers>
          <AuthProvider>
            <ThemeProvider>
              <SidebarProvider>
                <Analytics />
                <ProfileCheck />
                {children}
              </SidebarProvider>
            </ThemeProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
