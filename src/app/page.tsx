import { Users, BookOpen, CheckSquare } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-5xl w-full space-y-12">
        
        {/* Cabeçalho */}
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Sistema de Frequência e Oficinas
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Ambiente de desenvolvimento configurado. Escolha um módulo abaixo para iniciar.
          </p>
        </div>

        {/* Cards de Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-8 rounded-md shadow-sm border border-slate-200 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">Alunos</h2>
            </div>
            <p className="text-slate-500 text-sm mb-8 flex-grow">Cadastro e gestão da comunidade e participantes.</p>
            <Link href="/alunos" className="w-full flex justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">
              Acessar Alunos
            </Link>
          </div>

          <div className="bg-white p-8 rounded-md shadow-sm border border-slate-200 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Check-in</h2>
            </div>
            <p className="text-slate-500 text-sm mb-8 flex-grow">Registro de presença para as atividades diárias.</p>
            <Link href="/checkin" className="w-full flex justify-center py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors">
              Acessar Check-in
            </Link>
          </div>

          <div className="bg-white p-8 rounded-md shadow-sm border border-slate-200 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Cursos</h2>
            </div>
            <p className="text-slate-500 text-sm mb-8 flex-grow">Administração das turmas e oficinas oferecidas.</p>
            <Link href="/cursos" className="w-full flex justify-center py-2.5 px-4 bg-slate-600 hover:bg-slate-700 text-white rounded-md text-sm font-medium transition-colors">
              Acessar Cursos
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}