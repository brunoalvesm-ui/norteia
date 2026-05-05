import type { Metadata } from "next";
import "./globals.css";
import { BottomNavigation } from "@/components/bottom-navigation";
import { OnboardingProvider } from "@/context/OnboardingContext";

export const metadata: Metadata = {
  title: "Norteia",
  description: "Clareza financeira para pequenos empresários.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <OnboardingProvider>
          <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-5 sm:max-w-2xl lg:max-w-4xl">
            {children}
          </main>
          <BottomNavigation />
        </OnboardingProvider>
      </body>
    </html>
  );
}
