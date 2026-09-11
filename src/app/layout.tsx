import "./globals.css";

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
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}