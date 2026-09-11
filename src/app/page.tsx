import { Users, BookOpen, CheckSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center space-y-8">
        
        {/* Cabeçalho */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Sistema de Frequência e Oficinas
          </h1>
          <p className="text-lg text-slate-600">
            Ambiente de desenvolvimento configurado. Escolha um módulo abaixo para iniciar os testes.
          </p>
        </div>

        {/* Cards de Módulos (Mostrando o Tailwind + Lucide na prática) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center transition-hover hover:shadow-md">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Alunos</h2>
            <p className="text-slate-500 text-sm mt-2 mb-4">Cadastro da comunidade</p>
            <Link href="/alunos" className="mt-auto text-blue-600 font-medium flex items-center gap-1 hover:underline">
              Acessar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center transition-hover hover:shadow-md">
            <div className="bg-emerald-100 p-3 rounded-full mb-4">
              <CheckSquare className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Check-in</h2>
            <p className="text-slate-500 text-sm mt-2 mb-4">Registro de presença</p>
            <Link href="/checkin" className="mt-auto text-emerald-600 font-medium flex items-center gap-1 hover:underline">
              Acessar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center transition-hover hover:shadow-md">
            <div className="bg-purple-100 p-3 rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Cursos</h2>
            <p className="text-slate-500 text-sm mt-2 mb-4">Gestão de turmas</p>
            <Link href="/cursos" className="mt-auto text-purple-600 font-medium flex items-center gap-1 hover:underline">
              Acessar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}