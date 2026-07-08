import React from "react";
import { 
  Building, 
  CheckCircle, 
  TrendingUp, 
  Globe, 
  Calendar, 
  Database, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown, 
  HelpCircle,
  Tag,
  Trash2
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from "recharts";
import { DashboardStats, AppLog } from "../types";
import WordCloud from "./WordCloud";

interface DashboardAnalyticsProps {
  dashboardStats: DashboardStats | null;
  adminLogs: AppLog[];
  expandedLogId: string | null;
  setExpandedLogId: (id: string | null) => void;
  isStatsLoading: boolean;
  fetchDashboardData: () => void;
  onClearLogs?: () => Promise<boolean>;
}

export default function DashboardAnalytics({
  dashboardStats,
  adminLogs,
  expandedLogId,
  setExpandedLogId,
  isStatsLoading,
  fetchDashboardData,
  onClearLogs
}: DashboardAnalyticsProps) {
  const [selectedWord, setSelectedWord] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("Todos");
  const [selectedDateRange, setSelectedDateRange] = React.useState<string>("all");
  const [customDate, setCustomDate] = React.useState<string>("");

  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);

  const handleClearConfirm = async () => {
    if (onClearLogs) {
      setIsClearing(true);
      const success = await onClearLogs();
      setIsClearing(false);
      if (success) {
        setShowClearConfirm(false);
      }
    }
  };

  const categoriesList = React.useMemo(() => {
    const list = new Set<string>();
    adminLogs.forEach(log => {
      if (log.category) {
        list.add(log.category);
      }
    });
    return ["Todos", ...Array.from(list)];
  }, [adminLogs]);

  const filteredLogs = React.useMemo(() => {
    return adminLogs.filter(log => {
      // 1. Word cloud / text search filter
      if (selectedWord) {
        const wordLower = selectedWord.toLowerCase();
        const matchesQuery = log.query && log.query.toLowerCase().includes(wordLower);
        if (!matchesQuery) return false;
      }

      // 2. Category filter
      if (selectedCategory !== "Todos") {
        const cat = log.category || "Outros";
        if (cat !== selectedCategory) return false;
      }

      // 3. Date range filter
      if (selectedDateRange !== "all") {
        const logDate = new Date(log.timestamp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDateRange === "today") {
          const startOfToday = today.getTime();
          if (logDate.getTime() < startOfToday) return false;
        } else if (selectedDateRange === "7days") {
          const sevenDaysAgo = today.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (logDate.getTime() < sevenDaysAgo) return false;
        } else if (selectedDateRange === "30days") {
          const thirtyDaysAgo = today.getTime() - 30 * 24 * 60 * 60 * 1000;
          if (logDate.getTime() < thirtyDaysAgo) return false;
        } else if (selectedDateRange === "custom" && customDate) {
          const targetDate = new Date(customDate);
          // Set hours in local time
          const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1); // standard timezone offset handling for input type=date
          startOfDay.setHours(0, 0, 0, 0);
          
          const endOfDay = new Date(startOfDay);
          endOfDay.setDate(startOfDay.getDate() + 1);

          // We check if logDate is within that UTC/local day
          const logDateMidnight = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
          const compareDateMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
          
          // Let's do a simple date-string comparison which is highly reliable for local dates!
          const logDateStr = logDate.toISOString().split("T")[0]; // YYYY-MM-DD in UTC
          // Let's compare local date strings to be super safe:
          const logLocalStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, "0")}-${String(logDate.getDate()).padStart(2, "0")}`;
          if (logLocalStr !== customDate) {
            return false;
          }
        }
      }

      return true;
    });
  }, [adminLogs, selectedWord, selectedCategory, selectedDateRange, customDate]);

  if (isStatsLoading) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
        <RefreshCw className="w-8 h-8 text-emerald-800 animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm font-semibold">Atualizando estatísticas de interações e feedbacks...</p>
      </div>
    );
  }

  return (
    <>
      {/* Stats overview banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium uppercase font-mono tracking-wider">Perguntas Registradas</span>
          <h4 className="text-3xl font-bold text-slate-900 mt-1">{dashboardStats?.totalQueries || 0}</h4>
          <p className="text-[11px] text-slate-400 mt-2">Volume histórico consolidado neste servidor</p>
        </div>
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm text-emerald-900">
          <span className="text-xs text-emerald-700 font-medium uppercase font-mono tracking-wider">Útil (Like)</span>
          <h4 className="text-3xl font-bold mt-1 text-emerald-800">{dashboardStats?.usefulCount || 0}</h4>
          <p className="text-[11px] text-emerald-600 mt-2">Avaliações positivas dos usuários com base técnica</p>
        </div>
        <div className="bg-red-50 p-5 rounded-2xl border border-red-150 shadow-sm text-red-900">
          <span className="text-xs text-red-700 font-medium uppercase font-mono tracking-wider">Incoerente / Insatisfatório</span>
          <h4 className="text-3xl font-bold mt-1 text-red-800">{dashboardStats?.nonUsefulCount || 0}</h4>
          <p className="text-[11px] text-red-650 mt-2">Identificados para atualização de acervo RAG</p>
        </div>
        <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium uppercase font-mono tracking-wider">Precisão Semântica RAG</span>
          <h4 className="text-3xl font-bold text-slate-900 mt-1">
            {dashboardStats?.totalQueries && dashboardStats.totalQueries > 0
              ? Math.round(((dashboardStats.resolutionData?.[0]?.value || 0) / dashboardStats.totalQueries) * 100)
              : 100}%
          </h4>
          <p className="text-[11px] text-slate-400 mt-2">Taxa de assertividade das portarias</p>
        </div>
      </div>

      {/* Operational Analytics Graphics Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graph A: Topics breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-800" />
              Tópicos de Maior Relevância (Acessos)
            </h4>
            <p className="text-xs text-slate-500">Volume de solicitações classificadas automaticamente por categoria com base em termos</p>
          </div>
          <div className="h-64">
            {dashboardStats?.categoriesData && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardStats.categoriesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 12 }} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="quantidade" fill="#047857" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph B: Pie resolution rate chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-800" />
              Taxa de Resolução de IA
            </h4>
            <p className="text-xs text-slate-500">Comparação empírica de assertividade do bot ao localizar trechos corretos na base de dados</p>
          </div>
          <div className="h-44 flex items-center justify-center">
            {dashboardStats?.resolutionData && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardStats.resolutionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dashboardStats.resolutionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-1.5 text-xs">
            {dashboardStats?.resolutionData.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-slate-800">{item.value} ({Math.round(item.value / (dashboardStats.totalQueries || 1) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* NEW SECTION: Performance & Channels by Relevance Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graph C: Resolution x Routing by category */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-800" />
              Relação de Resolução x Direcionamento por Categoria
            </h4>
            <p className="text-xs text-slate-500">
              Monitoramento de dúvidas resolvidas automaticamente via RAG vs. contatos direcionados para suporte especializado
            </p>
          </div>
          <div className="h-64">
            {dashboardStats?.categoryResolutionData && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardStats.categoryResolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} interval={0} angle={-12} textAnchor="end" height={45} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 12 }} cursor={{ fill: "#F8FAFC" }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Resolvidos" fill="#10B981" radius={[4, 4, 0, 0]} name="Respondido RAG" />
                  <Bar dataKey="Direcionados" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Incompleto / Direcionado" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Contacts Map Directory */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-800" />
                  Canais & Contatos de Relevância
                </h4>
                <p className="text-xs text-slate-500">Mapeamento operacional de canais de atendimento por diretoria e assunto</p>
              </div>
            </div>
            <div className="mt-4 space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-slate-800">Coordenadoria de Extensão</p>
                  <p className="text-slate-500 font-mono text-[10px]">📞 Ramal 3023 | cadastro.extensao@ifes.edu.br</p>
                  <p className="text-[10px] text-slate-400">Suporte a novos cadastros de fomento e prazos no Sigext</p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-emerald-950">Agência de Inovação (Agifes)</p>
                  <p className="text-emerald-800 font-mono text-[10px]">📞 Ramal 3022 | agifes.ifes.edu.br</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Contatos especializados:</p>
                  <div className="grid grid-cols-1 gap-0.5 pl-2 border-l border-emerald-300 text-[10px] text-emerald-700 font-mono">
                    <span>• PI: agifes.pi@ifes.edu.br</span>
                    <span>• Incubadora: agifes.inc@ifes.edu.br</span>
                    <span>• Serviços: agifes.servtec@ifes.edu.br</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-indigo-950">Secretaria de Cultura e Difusão</p>
                  <p className="text-indigo-800 font-mono text-[10px]">📞 Ramal 3021 | secretaria.cultura@ifes.edu.br</p>
                  <p className="text-[10px] text-indigo-600">Apoio a mostras artísticas, fomento, NAC e festivais locais</p>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-2 text-slate-400 text-center text-[10px] font-mono">
            Base RAG Sincronizada com Contatos Oficiais
          </div>
        </div>

      </div>

      {/* Volume Timeline trend chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-800" />
            Volumetria de Acesso Semanal (Uso Operacional)
          </h4>
          <p className="text-xs text-slate-500">Número diário de dúvidas processadas pelo RAG no campus Vitória</p>
        </div>
        <div className="h-56">
          {dashboardStats?.accessTimelineData && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardStats.accessTimelineData}>
                <defs>
                  <linearGradient id="colorAcessos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#047857" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#047857" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="data" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="acessos" stroke="#047857" strokeWidth={2} fillOpacity={1} fill="url(#colorAcessos)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Real-time Word Cloud */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-800" />
            Nuvem de Palavras-Chave (Termos Mais Procurados)
          </h4>
          <p className="text-xs text-slate-500">
            Frequência acumulada de termos extraídos em tempo real das interações dos usuários. Clique em qualquer termo para filtrar os logs de auditoria abaixo.
          </p>
        </div>
        <WordCloud 
          logs={adminLogs} 
          onWordClick={(word) => setSelectedWord(word || null)} 
          selectedWord={selectedWord} 
        />
      </div>

      {/* Logs Table: Real history audit */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-800" />
              Auditoria de Interações (Logs de Atendimento)
            </h4>
            <p className="text-xs text-slate-500">
              Visão analítica das conversações tratadas pelo assistente para apoiar o planejamento de novos editais
              {selectedWord && (
                <span> (Filtrado por: <strong className="text-emerald-850">"{selectedWord}"</strong>)</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-mono font-semibold bg-slate-100 px-2 py-1 rounded text-slate-600">
              {filteredLogs.length} {filteredLogs.length === 1 ? "resultado" : "resultados"}
            </span>
            <button
              onClick={fetchDashboardData}
              className="text-xs text-slate-600 bg-white border border-slate-250 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer shadow-sm transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar Logs
            </button>
            {onClearLogs && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-rose-100 hover:border-rose-300 cursor-pointer shadow-sm transition font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Zerar Logs
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/30 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">
              Filtrar por Categoria
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700 cursor-pointer appearance-none"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "Todos" ? "🔍 Todas as Categorias" : cat}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Date / Period Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">
              Filtrar por Período
            </label>
            <div className="relative">
              <select
                value={selectedDateRange}
                onChange={(e) => {
                  setSelectedDateRange(e.target.value);
                  if (e.target.value !== "custom") {
                    setCustomDate("");
                  }
                }}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700 cursor-pointer appearance-none"
              >
                <option value="all">📅 Todo o histórico</option>
                <option value="today">☀️ Hoje</option>
                <option value="7days">🗓️ Últimos 7 dias</option>
                <option value="30days">📅 Últimos 30 dias</option>
                <option value="custom">🔍 Data específica...</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Custom Date Input or Clear Filters */}
          {selectedDateRange === "custom" ? (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">
                Escolha o Dia
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono text-slate-700 block"
              />
            </div>
          ) : (
            <div className="flex justify-end h-9 items-center">
              {(selectedCategory !== "Todos" || selectedDateRange !== "all" || selectedWord) && (
                <button
                  onClick={() => {
                    setSelectedCategory("Todos");
                    setSelectedDateRange("all");
                    setCustomDate("");
                    setSelectedWord(null);
                  }}
                  className="w-full md:w-auto text-[11px] uppercase font-bold text-slate-500 hover:text-emerald-800 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm cursor-pointer transition flex items-center justify-center gap-1.5 font-mono"
                >
                  <RefreshCw className="w-3 h-3" />
                  Limpar Todos os Filtros
                </button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-mono font-bold tracking-wider border-b border-slate-100">
                <th className="p-4">Data/Hora</th>
                <th className="p-4">Dúvida Registrada</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Status / Resposta</th>
                <th className="p-4">Satisfação (Feedback)</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-slate-50/50 transition">
                    <td className="p-4 text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-4 font-medium text-slate-900 max-w-xs truncate" title={log.query}>
                      {log.query}
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] font-mono text-slate-600">
                        {log.category || "Outros"}
                      </span>
                    </td>
                    <td className="p-4">
                      {log.resolved ? (
                        <span className="flex items-center gap-1 text-emerald-704 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Respondido RAG
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                          Fora do Acervo
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {log.feedback === "like" && (
                        <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded inline-flex items-center gap-1 font-semibold">
                          <ThumbsUp className="w-3 h-3" /> Útil
                        </span>
                      )}
                      {log.feedback === "dislike" && (
                        <div className="space-y-0.5">
                          <span className="bg-red-50 text-red-800 px-2.5 py-1 rounded inline-flex items-center gap-1 font-semibold">
                            <ThumbsDown className="w-3 h-3" /> Não Útil
                          </span>
                          {log.feedbackText && (
                            <p className="text-[10px] text-red-655 italic max-w-xs truncate" title={log.feedbackText}>
                              Ref: "{log.feedbackText}"
                            </p>
                          )}
                        </div>
                      )}
                      {!log.feedback && <span className="text-slate-400 font-mono">-</span>}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className="text-emerald-800 hover:underline font-semibold cursor-pointer"
                      >
                        {expandedLogId === log.id ? "Ocultar" : "Inspecionar"}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded row details panel */}
                  {expandedLogId === log.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={6} className="p-5 border-y border-slate-200">
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <h5 className="font-bold text-slate-900 border-b border-slate-150 pb-1 mb-1">Dúvida enviada pelo cidadão:</h5>
                            <p className="text-slate-700 font-medium font-mono text-[13px] bg-white p-3 rounded border border-slate-200">
                              "{log.query}"
                            </p>
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 border-b border-slate-150 pb-1 mb-1">Transcrição consolidada do bot:</h5>
                            <p className="text-slate-700 leading-relaxed bg-white p-3 rounded border border-slate-200">
                              {log.responseText}
                            </p>
                          </div>
                          {log.matchedChunks && log.matchedChunks.length > 0 ? (
                            <div>
                              <h5 className="font-bold text-slate-900 border-b border-slate-150 pb-1 mb-1.5">
                                Trecho do banco de dados (RAG matching IDs):
                              </h5>
                              <div className="flex gap-2 flex-wrap">
                                {log.matchedChunks.map((chunkId) => (
                                  <span key={chunkId} className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-mono font-semibold">
                                    ID: {chunkId}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-red-50 text-red-900 p-3 rounded border border-red-200 font-medium">
                              ⚠️ Nenhum bloco localizado na base de dados para similaridade deste termo. O bot recomendou o canal principal proex@ifes.edu.br.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear Logs Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-155">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-800 rounded-full flex items-center justify-center mx-auto border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              
              <div className="text-center space-y-1.5">
                <h4 className="font-bold text-slate-900 text-base">Zerar Histórico de Atendimentos?</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Esta ação irá apagar <strong>todos</strong> os registros de dúvidas e logs gravados até o momento. O painel será limpo para que você inicie uma nova bateria de testes. Esta operação é irreversível.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2 bg-white border border-slate-250 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearConfirm}
                disabled={isClearing}
                className="px-4 py-2 bg-rose-750 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg transition shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Apagando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Sim, Zerar Tudo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
