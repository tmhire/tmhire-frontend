import { Outfit } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import { SidebarProvider } from "@/context/SidebarContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import WelcomeModal from "@/components/onboarding/WelcomeModal";

const outfit = Outfit({
  subsets: ["latin"],
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <Providers>
          <AuthProvider>
            <ThemeProvider>
              <SidebarProvider>
                {session?.new_user && (
                  <>
                    <div className="dark:bg-gray-800 bg-gray-200 p-3 dark:text-brand-300 text-brand-800 text-sm text-right">
                      Welcome! Let&apos;s get you started.
                    </div>
                    <WelcomeModal />
                  </>
                )}
                {children}
              </SidebarProvider>
            </ThemeProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
