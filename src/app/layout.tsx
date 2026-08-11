import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../hooks/useAuth";
import { CustomThemeProvider } from "../components/common/ThemeRegistry";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Fresh & Fish - Ledger Manager",
  description: "Web ledger credit and payment manager for Fresh & Fish Shop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <AuthProvider>
          <CustomThemeProvider>
            {children}
          </CustomThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
