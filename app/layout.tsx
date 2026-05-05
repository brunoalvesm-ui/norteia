import type { Metadata } from "next";
import "./globals.css";
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
          {children}
        </OnboardingProvider>
      </body>
    </html>
  );
}
