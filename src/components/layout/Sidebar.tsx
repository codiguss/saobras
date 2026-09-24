"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  BookOpen,
  CheckSquare,
  LogOut,
  GraduationCap,
  Shield,
  Clock,
  FileText,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: "Gestão de Alunos", href: "/alunos", icon: Users },
    { name: "Matrículas", href: "/matriculas", icon: GraduationCap },
    { name: "Frequência (Check-in)", href: "/checkin", icon: CheckSquare },
    { name: "Cursos e Turmas", href: "/cursos", icon: BookOpen },
    { name: "Histórico", href: "/historico", icon: Clock },
    { name: "Relatórios", href: "/relatorios", icon: FileText },
    { name: "Operadores", href: "/operadores", icon: Shield },
  ];

  const handleLogout = async () => {
    const { supabase } = await import("@/lib/supabase");

    await supabase.auth.signOut();

    window.location.href = "/login";
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      {/* Cabeçalho da Sidebar */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <h2 className="font-bold text-slate-800 text-lg tracking-tight">
          Sist. Frequência
        </h2>
      </div>

      {/* Navegação */}
      <nav className="px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-100 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? "text-blue-600" : "text-slate-400"
                }`}
              />

              {item.name}
            </Link>
          );
        })}

        {/* Botão Sair */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors group mt-2"
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-600" />
          Sair do Sistema
        </button>
      </nav>
    </aside>
  );
}
