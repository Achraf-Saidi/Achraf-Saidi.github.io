import type { Metadata } from "next";
import "./globals.css";
import {PreferencesProvider} from '@/components/sahati-ui';

export const metadata: Metadata = {
  title: "SAHATI — Le soin, relié.",
  description: "Une plateforme hospitalière intégrée, pensée pour les soins en Algérie. Accès privé de démonstration.",
  robots: {index:false,follow:false},
  icons: {
    icon: "/brand/logo.png",
    shortcut: "/brand/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body><PreferencesProvider>{children}</PreferencesProvider></body>
    </html>
  );
}
