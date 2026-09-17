import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Sistema de Frequência",
  description: "Gestão de oficinas do instituto",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body className="bg-slate-50 text-slate-900 text-sm antialiased min-h-screen"
      suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}