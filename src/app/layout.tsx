import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import { SidebarProvider } from "@/context/SidebarContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ProfileCheck from "@/components/onboarding/ProfileCheck";
import { Analytics } from "@vercel/analytics/next";
import { Metadata } from "next";
import { SearchProvider } from "@/context/SearchContext";

const outfit = Outfit({
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "TM Grid - Concrete Calculator",
    template: "%s | TM Grid - Concrete Calculator",
  },
  description:
    "Streamline your concrete operations with TM Grid's comprehensive concrete calculator and management platform",
  keywords: ["concrete calculator", "concrete management", "construction", "concrete operations", "TM Grid"],
  authors: [{ name: "TM Grid" }],
  creator: "TM Grid",
  publisher: "TM Grid",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://tmgrid.in"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tmgrid.in",
    title: "TM Grid - Concrete Calculator",
    description:
      "Streamline your concrete operations with TM Grid's comprehensive concrete calculator and management platform",
    siteName: "TM Grid",
    images: [
      {
        url: "https://i.ibb.co/S4SG9K1p/image.png",
        width: 1200,
        height: 630,
        alt: "TM Grid - Concrete Calculator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TM Grid - Concrete Calculator",
    description:
      "Streamline your concrete operations with TM Grid's comprehensive concrete calculator and management platform",
    images: ["https://i.ibb.co/S4SG9K1p/image.png"],
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
      <body className={`${outfit.className} ${jetBrainsMono.variable} dark:bg-gray-900`}>
        <SearchProvider>
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
        </SearchProvider>
      </body>
    </html>
  );
}
