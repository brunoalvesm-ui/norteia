import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { BottomNavigation } from "@/components/bottom-navigation";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "Norteia",
  description: "Estrutura inicial do SaaS Norteia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${dmSans.variable} ${syne.variable} font-sans antialiased`}>
        <div className="min-h-screen">
          <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-5 sm:max-w-2xl lg:max-w-4xl">
            {children}
          </main>
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}
