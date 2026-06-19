import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Sparkles, 
  Database, 
  Settings, 
  BarChart3, 
  Send, 
  Trash2, 
  Plus, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  BookOpen, 
  Globe, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  Info, 
  Mail, 
  Phone, 
  Sliders, 
  HelpCircle,
  Building,
  Calendar,
  Check,
  Lock,
  LogOut,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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

// Interfaces for our state variables
interface Source {
  id: string;
  type: "url" | "text";
  value: string;
  title: string;
}

interface BotConfig {
  botName: string;
  systemInstruction: string;
  threshold: number;
  welcomeMessage: string;
}

interface RAGStatus {
  chunkCount: number;
  embeddedCount: number;
  hasApiKey: boolean;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  isVector?: boolean;
  matchedChunks?: { title: string; source: string; content: string }[];
  feedback?: "like" | "dislike" | null;
  logId?: string;
}

interface DashboardStats {
  totalQueries: number;
  usefulCount: number;
  nonUsefulCount: number;
  resolutionData: { name: string; value: number; color: string }[];
  categoriesData: { name: string; quantidade: number }[];
  accessTimelineData: { data: string; acessos: number }[];
  categoryResolutionData?: { name: string; Resolvidos: number; Direcionados: number }[];
}

interface AppLog {
  id: string;
  timestamp: string;
  query: string;
  responseText: string;
  matchedChunks: string[];
  resolved: boolean;
  category: string;
  feedback: "like" | "dislike" | null;
  feedbackText: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard" | "settings">("chat");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Olá! Seja muito bem-vindo ao portal de atendimento da Pró-Reitoria de Extensão (Proex/Ifes). Estou aqui para responder dúvidas institucionais com base nos documentos oficiais de editais do Pibex, as diretrizes de Estágios, Cursos de Extensão (FIC) e Núcleos de Arte e Cultura. Como posso ajudar você hoje?",
      timestamp: new Date().toLocaleTimeString(),
      matchedChunks: []
    }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedLogForComment, setSelectedLogForComment] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Suggested Prompts
  const suggestedQuestions = [
    { text: "O que é o Portal Integra e o que ele concentra?", category: "integra" },
    { text: "Como funciona a curricularização de extensão no Ifes?", category: "curricularizacao" },
    { text: "Como funciona o Programa de Apoio à Extensão (PAEX)?", category: "paex" },
    { text: "Como funciona o fluxo de inovação ou patente na Agifes?", category: "inovacao" },
    { text: "Qual o papel e atribuições da Câmara de Extensão?", category: "camara" },
    { text: "Como solicitar o registro de programa de computador no Ifes?", category: "software" },
    { text: "O que é o Fórum de Integração Escola-Empresa-Comunidade (Fiec)?", category: "fiec" },
    { text: "Como funciona o apoio ao Jovem Aprendiz no Ifes?", category: "jovem" }
  ];

  // Config State
  const [botConfig, setBotConfig] = useState<BotConfig>({
    botName: "Assistente Proex",
    systemInstruction: "",
    threshold: 0.25,
    welcomeMessage: "Olá! Seja muito bem-vindo ao portal de atendimento da Pró-Reitoria de Extensão (Proex/Ifes). Estou aqui para responder dúvidas institucionais com base nos documentos oficiais de editais do Pibex, as diretrizes de Estágios, Cursos de Extensão (FIC) e Núcleos de Arte e Cultura. Como posso ajudar você hoje?"
  });
  const [ragStatus, setRagStatus] = useState<RAGStatus>({
    chunkCount: 0,
    embeddedCount: 0,
    hasApiKey: false
  });
  const [sources, setSources] = useState<Source[]>([]);
  
  // Source Inputs
  const [newSourceType, setNewSourceType] = useState<"url" | "text">("url");
  const [newSourceTitle, setNewSourceTitle] = useState("");
  const [newSourceValue, setNewSourceValue] = useState("");
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [sourceActionMessage, setSourceActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Training Simulation
  const [isTraining, setIsTraining] = useState(false);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [currentTrainingStep, setCurrentTrainingStep] = useState(0);

  // Administrative stats & Logs
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [adminLogs, setAdminLogs] = useState<AppLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  // Gestor Login Credentials
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("proex_authenticated") === "true";
  });
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError("Por favor, preencha todos os campos.");
      return;
    }
    if (loginUser.trim().toLowerCase() === "proex" && loginPass === "Proex@2026") {
      setIsAuthenticated(true);
      sessionStorage.setItem("proex_authenticated", "true");
      setLoginError("");
      setLoginUser("");
      setLoginPass("");
    } else {
      setLoginError("Usuário ou senha incorretos.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("proex_authenticated");
    setActiveTab("chat");
  };

  const renderLoginForm = (title: string) => {
    return (
      <motion.div
        key="login-form-container"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.2 }}
        className="max-w-md w-full mx-auto my-12 bg-white p-8 rounded-2xl shadow-md border border-slate-200"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100 text-emerald-800">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Acesso Restrito</h3>
          <p className="text-xs text-slate-500 mt-1">
            Insira suas credenciais para gerenciar o <strong>{title}</strong> da PROEX
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Usuário / E-mail
            </label>
            <input
              type="text"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              placeholder="proex"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Senha de Acesso
            </label>
            <input
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
            />
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm rounded-lg shadow transition-all hover:shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Lock className="w-4 h-4" />
            <span>Confirmar Login</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400">
            Acesso exclusivo para servidores da Pró-Reitoria de Extensão do Ifes.
          </p>
        </div>
      </motion.div>
    );
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial configs and RAG statuses
  useEffect(() => {
    fetchConfigs();
    fetchRAGStatus();
    fetchSources();
  }, []);

  // Sync scroll on chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatLoading]);

  // Handle Tab changes
  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardData();
    }
  }, [activeTab]);

  // Sync welcome message on configuration load/changes
  useEffect(() => {
    if (botConfig.welcomeMessage) {
      setMessages(prev => {
        if (prev.length > 0 && prev[0].id === "welcome") {
          const updated = [...prev];
          updated[0] = { ...updated[0], text: botConfig.welcomeMessage };
          return updated;
        }
        return prev;
      });
    }
  }, [botConfig.welcomeMessage]);

  const fetchConfigs = async () => {
    try {
      const r = await fetch("/api/config");
      const data = await r.json();
      setBotConfig(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRAGStatus = async () => {
    try {
      const r = await fetch("/api/rag/status");
      const data = await r.json();
      setRagStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSources = async () => {
    try {
      const r = await fetch("/api/rag/sources");
      const data = await r.json();
      setSources(data.sources);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardData = async () => {
    setIsStatsLoading(true);
    try {
      const r1 = await fetch("/api/dashboard/stats");
      const sData = await r1.json();
      setDashboardStats(sData);

      const r2 = await fetch("/api/logs");
      const lData = await r2.json();
      setAdminLogs(lData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsStatsLoading(false);
    }
  };

  // Submit dynamic system configuration update
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(botConfig)
      });
      const data = await r.json();
      if (data.success) {
        setBotConfig(data.config);
        alert("Configurações salvas com sucesso!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Restores default prompt configuration
  const handleRestoreDefaultConfig = async () => {
    const defaultInstruction = "Você é o assistente virtual oficial da Pró-Reitoria de Extensão (Proex) do Ifes. Seu conhecimento é pautado na Base de Conhecimento RAG. Use marcadores gráficos, listas estruturadas, emojis ou espaços para dar destaque no lugar de negritos (NUNCA use asteriscos como ** nas suas respostas). Caso considere necessário ou útil, você é incentivado(a) a enviar links de formulários e arquivos oficiais do site da Proex (no domínio https://proex.ifes.edu.br). Se a resposta não puder ser obtida através do contexto fornecido, instrua o usuário a entrar em contato com o setor responsável pelo e-mail oficial (proex@ifes.edu.br) ou pelo telefone (27) 3357-7540 ramal 3019 de forma acolhedora. Responda detalhadamente em língua portuguesa.";
    const defaultWelcome = "Olá! Seja muito bem-vindo ao portal de atendimento da Pró-Reitoria de Extensão (Proex/Ifes). Estou aqui para responder dúvidas institucionais com base nos documentos oficiais de editais do Pibex, as diretrizes de Estágios, Cursos de Extensão (FIC) e Núcleos de Arte e Cultura. Como posso ajudar você hoje?";
    const updated = { ...botConfig, systemInstruction: defaultInstruction, threshold: 0.25, welcomeMessage: defaultWelcome };
    try {
      const r = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      const data = await r.json();
      if (data.success) {
        setBotConfig(data.config);
        alert("Configuração padrão restaurada com sucesso!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit new RAG crawled reference link / manual document
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceValue.trim()) return;

    setIsAddingSource(true);
    try {
      const r = await fetch("/api/rag/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newSourceType,
          title: newSourceTitle,
          value: newSourceValue
        })
      });
      const data = await r.json();
      if (data.success) {
        setSources([...sources, data.source]);
        setNewSourceTitle("");
        setNewSourceValue("");
        setSourceActionMessage({
          text: "Fonte cadastrada com sucesso! Lembre-se de clicar em 'Atualizar Base de Dados' para sincronizar com o bot.",
          type: "success"
        });
        setTimeout(() => setSourceActionMessage(null), 8000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingSource(false);
    }
  };

  // Remove source
  const handleDeleteSource = async (id: string) => {
    try {
      const r = await fetch(`/api/rag/sources/${id}`, {
        method: "DELETE"
      });
      const data = await r.json();
      if (data.success) {
        setSources(sources.filter(s => s.id !== id));
        setSourceActionMessage({
          text: "Fonte de dados removida com sucesso. Recomenda-se treinar a base para consolidar.",
          type: "success"
        });
        setTimeout(() => setSourceActionMessage(null), 6000);
      } else {
        setSourceActionMessage({
          text: "Não foi possível remover a fonte de dados.",
          type: "error"
        });
        setTimeout(() => setSourceActionMessage(null), 6000);
      }
    } catch (e) {
      console.error(e);
      setSourceActionMessage({
        text: "Erro ao se comunicar com o servidor para remover a fonte.",
        type: "error"
      });
      setTimeout(() => setSourceActionMessage(null), 6000);
    } finally {
      setDeletingSourceId(null);
    }
  };

  // Trigger training engine RAG process
  const handleTrainRAG = async () => {
    setIsTraining(true);
    setCurrentTrainingStep(0);
    setTrainingLogs([
      "➜ Iniciando pipeline de processamento RAG...",
    ]);

    // Simple visual steps
    const timer = (ms: number) => new Promise(res => setTimeout(res, ms));
    
    await timer(600);
    setCurrentTrainingStep(1);
    setTrainingLogs(prev => [...prev, "➜ Carregando o acervo de fontes do cadastramento..."]);
    
    await timer(800);
    setCurrentTrainingStep(2);
    setTrainingLogs(prev => [...prev, "➜ Limpando scripts e tags estruturais de HTML do portal Ifes..."]);
    
    await timer(900);
    setCurrentTrainingStep(3);
    setTrainingLogs(prev => [...prev, "➜ Particionando textos em blocos ótimos (chunking) de 500 caracteres..."]);
    
    await timer(700);
    setCurrentTrainingStep(4);
    setTrainingLogs(prev => [
      ...prev, 
      ragStatus.hasApiKey 
        ? "➜ Enviando blocos para o Gemini [gemini-embedding-2-preview] para gerar vetores de alta dimensionalidade..." 
        : "➜ Identificando índice de termos em memória (Busca Léxica Ativa sem chave API)..."
    ]);

    try {
      const r = await fetch("/api/rag/train", {
        method: "POST"
      });
      const data = await r.json();
      
      if (data.success) {
        setCurrentTrainingStep(5);
        setTrainingLogs(data.log);
        fetchRAGStatus();
      } else {
        setTrainingLogs(prev => [...prev, "❌ Erro durante o treinamento: " + data.error]);
      }
    } catch (e: any) {
      setTrainingLogs(prev => [...prev, "❌ Erro de conexão com o servidor: " + e.message]);
    } finally {
      setIsTraining(false);
    }
  };

  // Send message from user
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMsg;
    if (!textToSend.trim()) return;

    const userMessage: ChatMessage = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customText) setInputMsg("");
    setIsChatLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend })
      });
      const data = await r.json();

      const botMessage: ChatMessage = {
        id: "bot_" + Date.now(),
        sender: "bot",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString(),
        isVector: data.isVectorSearch,
        matchedChunks: data.matchedChunks,
        logId: data.logId,
        feedback: null
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: "err_" + Date.now(),
        sender: "bot",
        text: "Desculpe, ocorreu um erro de comunicação com o servidor Proex. Por favor, tente novamente mais tarde.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // User feedback on reply
  const handleFeedback = async (messageId: string, logId: string, status: "like" | "dislike") => {
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, status })
      });
      const data = await r.json();
      if (data.success) {
        // update local message state
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: status } : m));
        
        if (status === "dislike") {
          setSelectedLogForComment(logId);
          setFeedbackComment("");
          setFeedbackSuccess(null);
        } else {
          setFeedbackSuccess("Obrigado pelo seu feedback positivo!");
          setTimeout(() => setFeedbackSuccess(null), 3000);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit text comment feedback
  const handleSubmitFeedbackComment = async () => {
    if (!selectedLogForComment) return;
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          logId: selectedLogForComment, 
          status: "dislike", 
          comments: feedbackComment 
        })
      });
      const data = await r.json();
      if (data.success) {
        setFeedbackSuccess("Seu comentário foi registrado para melhoria das futuras respostas. Obrigado!");
        setSelectedLogForComment(null);
        setTimeout(() => setFeedbackSuccess(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      {/* Top Professional Institutional Header */}
      <header className="bg-emerald-800 text-white shadow-md border-b-4 border-emerald-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left self-center">
            <div className="bg-white p-2 rounded-lg text-emerald-800 shadow-sm flex items-center justify-center shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="font-bold tracking-wide text-lg md:text-xl">IFES</span>
                <span className="text-[10px] bg-emerald-600 px-2 py-0.5 rounded-full text-emerald-100 uppercase tracking-widest font-mono font-semibold">Proex</span>
              </div>
              <p className="text-xs text-emerald-100 tracking-tight">Pró-Reitoria de Extensão — Chatbot inteligente com RAG</p>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex flex-wrap sm:flex-nowrap items-center justify-center bg-emerald-900/50 p-1 md:p-1.5 rounded-xl border border-emerald-750 gap-0.5">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-4 md:py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                activeTab === "chat" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-emerald-100 hover:bg-emerald-800/40"
              }`}
            >
              <Bot className="w-3.5 h-3.5 md:w-4 h-4" />
              <span>Assistente</span>
            </button>
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-4 md:py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                activeTab === "dashboard" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-emerald-100 hover:bg-emerald-800/40"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 md:w-4 h-4" />
              <span>Painel <span className="hidden sm:inline">Gestor</span></span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-4 md:py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                activeTab === "settings" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-emerald-100 hover:bg-emerald-800/40"
              }`}
            >
              <Settings className="w-3.5 h-3.5 md:w-4 h-4" />
              <span><span className="hidden sm:inline">Configuração & </span>RAG</span>
            </button>
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 ml-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-red-200 hover:text-white bg-red-950/40 hover:bg-red-800/50 transition-all border border-red-900/30"
                title="Sair da Área Proex"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: CHAT BOT CLIENT */}
          {activeTab === "chat" && (
            <motion.div
              key="chat-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Chat Main Window (Col span 2) */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-230px)] sm:h-[calc(100vh-180px)] min-h-[480px] sm:min-h-[500px]">
                {/* Chat header status bar */}
                <div className="px-3 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 rounded-t-2xl gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse mt-1.5 shrink-0" />
                    <div>
                      <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 leading-none">
                        {botConfig.botName}
                        <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">v1.2</span>
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 sm:line-clamp-none">Respostas confiáveis baseadas estritamente em informações postadas no site da PROEX</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-600 font-mono">{ragStatus.chunkCount}</span>
                    <span className="text-slate-400">referências</span>
                  </div>
                </div>

                {/* Message display pane */}
                <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 bg-slate-50/30">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3 sm:p-4 shadow-sm border relative ${
                        m.sender === "user"
                          ? "bg-emerald-800 text-white border-emerald-900 rounded-tr-none" 
                          : "bg-white text-slate-800 border-slate-200 rounded-tl-none"
                      }`}>
                        {/* Heading for system responses */}
                        {m.sender === "bot" && (
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-2 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                            <span className="font-semibold flex items-center gap-1">
                              <Bot className="w-3 h-3 text-emerald-600" />
                              {botConfig.botName}
                            </span>
                            <span>{m.timestamp}</span>
                          </div>
                        )}

                        <div className="text-sm leading-relaxed whitespace-pre-line break-words">
                          {m.text}
                        </div>

                        {/* RAG Context sources footer */}
                        {m.sender === "bot" && m.matchedChunks && m.matchedChunks.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100">
                            <details className="group">
                              <summary className="text-[11px] font-semibold text-emerald-800 cursor-pointer hover:text-emerald-900 flex items-center justify-between select-none outline-none">
                                <span className="flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Origens consultadas: {m.matchedChunks.length} trechos da base</span>
                                </span>
                                <span className="text-[10px] text-slate-400 bg-slate-100 group-open:bg-emerald-50 group-open:text-emerald-700 px-1.5 py-0.5 rounded transition-transform duration-200">
                                  <span className="inline-block group-open:hidden">Mostrar</span>
                                  <span className="hidden group-open:inline">Ocultar</span>
                                </span>
                              </summary>
                              <div className="mt-2.5 space-y-1.5 animate-fade-in pl-1">
                                {m.matchedChunks.map((c, idx) => (
                                  <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-150 text-[11px] text-slate-700">
                                    <div className="font-semibold flex items-center gap-1 mb-0.5 text-slate-900">
                                      <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                      <span>{c.title}</span>
                                    </div>
                                    <p className="italic text-slate-600 leading-snug">"{c.content}"</p>
                                    <div className="mt-1 text-[9px] text-slate-400 flex items-center gap-1 truncate font-mono">
                                      <Globe className="w-2.5 h-2.5" />
                                      <span>{c.source}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}

                        {/* Vector indicator */}
                        {m.sender === "bot" && m.id !== "welcome" && (
                          <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span>Busca: {m.isVector ? "Vetorial (Gemini-Embedding)" : "Palavras-chave (Léxica)"}</span>
                            </span>

                            {/* Helpful rating buttons */}
                            {m.logId && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]">Esta resposta foi útil?</span>
                                <button
                                  onClick={() => handleFeedback(m.id, m.logId!, "like")}
                                  className={`p-1 rounded hover:bg-slate-100 transition ${m.feedback === "like" ? "text-emerald-600 bg-emerald-50 font-bold" : "text-slate-400"}`}
                                  title="Útil"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleFeedback(m.id, m.logId!, "dislike")}
                                  className={`p-1 rounded hover:bg-slate-100 transition ${m.feedback === "dislike" ? "text-red-600 bg-red-50 font-bold" : "text-slate-400"}`}
                                  title="Não útil"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Loading placeholder */}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-slate-800 rounded-2xl p-4 shadow-sm border rounded-tl-none border-emerald-100 max-w-[60%]">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-2 text-[10px] uppercase font-mono text-slate-400">
                          <span className="font-semibold flex items-center gap-1">
                            <Bot className="w-3 h-3 text-emerald-600" />
                            Pesquisando base...
                          </span>
                        </div>
                        <div className="flex items-center gap-2 py-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          <span className="text-xs text-slate-500 ml-2">Vasculhando vetor e gerando resposta...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Feedback Comment box drawer (if dislike selected) */}
                {selectedLogForComment && (
                  <div className="bg-red-50 p-4 border-t border-red-200 animate-slide-up">
                    <p className="text-xs text-red-900 font-semibold mb-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-red-700" />
                      Como podemos melhorar esta resposta? Por favor, nos diga qual a inconsistência encontrada:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Ex: O e-mail informado está diferente do edital mais recente..."
                        className="flex-1 text-xs px-3 py-2 border border-red-200 rounded-lg outline-none focus:border-red-400 bg-white"
                      />
                      <button
                        onClick={handleSubmitFeedbackComment}
                        className="bg-red-700 text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-red-800 transition"
                      >
                        Enviar Comentário
                      </button>
                      <button
                        onClick={() => setSelectedLogForComment(null)}
                        className="text-slate-500 text-xs px-2 hover:underline"
                      >
                        Pular
                      </button>
                    </div>
                  </div>
                )}

                {/* Floating Success Alert */}
                {feedbackSuccess && (
                  <div className="bg-emerald-500 text-white px-4 py-2 text-center text-xs font-semibold select-none flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{feedbackSuccess}</span>
                  </div>
                )}

                {/* Input action toolbar */}
                <div className="p-3 sm:p-4 border-t border-slate-100 bg-white rounded-b-2xl">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMsg}
                      onChange={(e) => setInputMsg(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Faça uma pergunta sobre Editais, Bolsas, Estágios..."
                      className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 border border-slate-200 rounded-xl outline-none focus:border-emerald-600 transition text-xs sm:text-sm bg-slate-50/50 min-w-0"
                      disabled={isChatLoading}
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      className="bg-emerald-800 text-white px-4 sm:px-5 rounded-xl flex items-center justify-center hover:bg-emerald-900 active:scale-95 transition shadow-sm font-semibold shrink-0"
                      disabled={isChatLoading}
                    >
                      <Send className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Perguntar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar Guide & Status Details (Col span 1) - Hidden on mobile, visible on lg and up */}
              <div className="hidden lg:block space-y-6">
                
                {/* Institutional Info Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Sliders className="w-4 h-4 text-emerald-800" />
                    Perguntas Sugeridas
                  </h3>
                  <div className="space-y-2.5">
                    {suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q.text)}
                        className="text-left w-full p-2.5 rounded-xl border border-slate-150 hover:border-emerald-700 bg-slate-50 hover:bg-emerald-50/30 transition text-xs flex items-start gap-2 text-slate-700"
                        disabled={isChatLoading}
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-700 mt-0.5 shrink-0" />
                        <span>{q.text}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact support channels panel */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-xs text-slate-600 space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-emerald-800" />
                    Atendimento Oficial Ifes
                  </h4>
                  <p>Caso a sua dúvida não seja contemplada pelas portarias regulamentares, contate os canais oficiais do campus:</p>
                  <div className="space-y-2 font-mono">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <a href="mailto:proex@ifes.edu.br" className="text-emerald-800 hover:underline">proex@ifes.edu.br</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>(27) 3357-7540 ramal 3019</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Seg. a Sex. (08h às 18h)</span>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}


          {/* TAB 2: ADMINISTRATIVE DASHBOARD */}
          {activeTab === "dashboard" && (
            !isAuthenticated ? (
              renderLoginForm("Painel Gestor")
            ) : (
              <motion.div
                key="dashboard-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
              {/* Stats overview banner */}
              {isStatsLoading ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                  <RefreshCw className="w-8 h-8 text-emerald-800 animate-spin mx-auto mb-4" />
                  <p className="text-slate-500 text-sm font-semibold">Atualizando estatísticas de interações e feedbacks...</p>
                </div>
              ) : (
                <>
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
                      <p className="text-[11px] text-red-600 mt-2">Identificados para atualização de acervo RAG</p>
                    </div>
                    <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <span className="text-xs text-slate-500 font-medium uppercase font-mono tracking-wider">Precisão Semântica RAG</span>
                      <h4 className="text-3xl font-bold text-slate-900 mt-1">
                        {dashboardStats?.totalQueries && dashboardStats.totalQueries > 0
                          ? Math.round(( (dashboardStats.resolutionData?.[0]?.value || 0) / dashboardStats.totalQueries) * 100)
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

                  {/* Logs Table: Real history audit */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Database className="w-4 h-4 text-emerald-800" />
                          Auditoria de Interações (Logs de Atendimento)
                        </h4>
                        <p className="text-xs text-slate-500">Visão analítica das conversações tratadas pelo assistente para apoiar o planejamento de novos editais</p>
                      </div>
                      <button
                        onClick={fetchDashboardData}
                        className="text-xs text-slate-600 bg-white border border-slate-250 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Atualizar Logs
                      </button>
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
                          {adminLogs.map((log) => (
                            <>
                              <tr key={log.id} className="hover:bg-slate-50/50 transition">
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
                                        <p className="text-[10px] text-red-600 italic max-w-xs truncate" title={log.feedbackText}>
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
                                    className="text-emerald-800 hover:underline font-semibold"
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
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}


          {/* TAB 3: CONFIGURATIONS & RAW DATA TRAINER */}
          {activeTab === "settings" && (
            !isAuthenticated ? (
              renderLoginForm("Configurações & RAG")
            ) : (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
              
              {/* Bot prompt system configurations (Col span 2) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Form System Instruction Customization */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-emerald-800" />
                        Customização do Agente Virtual
                      </h4>
                      <p className="text-xs text-slate-500">Altere o codinome de exibição e edite o prompt sistêmico de restrição da IA</p>
                    </div>
                    <button
                      onClick={handleRestoreDefaultConfig}
                      className="text-xs text-emerald-800 border-b border-emerald-800 hover:text-emerald-950 font-semibold"
                    >
                      Restaurar Prompt Inicial
                    </button>
                  </div>

                  <form onSubmit={handleSaveConfig} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Codinome do Assistente:</label>
                      <input
                        type="text"
                        value={botConfig.botName}
                        onChange={(e) => setBotConfig({ ...botConfig, botName: e.target.value })}
                        className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-600 bg-slate-50/30"
                        placeholder="Ex: Assistente Proex"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Mensagem Inicial de Boas-vindas:</label>
                      <textarea
                        rows={3}
                        value={botConfig.welcomeMessage}
                        onChange={(e) => setBotConfig({ ...botConfig, welcomeMessage: e.target.value })}
                        className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-600 bg-slate-50/30 leading-relaxed"
                        placeholder="Insira a mensagem que o bot exibirá na abertura do chat..."
                        required
                      />
                      <p className="text-[10px] text-slate-400">
                        * Esta mensagem será mostrada no balão inicial do chat para recepcionar os usuários da Proex.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">System Instruction (Prompt de Configuração):</label>
                      <textarea
                        rows={7}
                        value={botConfig.systemInstruction}
                        onChange={(e) => setBotConfig({ ...botConfig, systemInstruction: e.target.value })}
                        className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-600 bg-slate-50/30 font-mono leading-relaxed"
                        placeholder="Insira as diretrizes de papel, escopo e restrições..."
                        required
                      />
                      <p className="text-[10px] text-slate-400">
                        * O prompt de instruções de sistema instrui estritamente o modelo a nunca extrapolar os limites do contexto carregado por RAG, garantindo respostas confiáveis anti-alucinações.
                      </p>
                    </div>

                    {/* Threshold slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-slate-700">Limite de Similaridade Vetorial (Threshold):</label>
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-semibold text-emerald-800">{botConfig.threshold}</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="0.80"
                        step="0.05"
                        value={botConfig.threshold}
                        onChange={(e) => setBotConfig({ ...botConfig, threshold: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-800"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>0.10 (Mais flexível / Aceita menos similaridade)</span>
                        <span>0.80 (Mais rigoroso / Apenas correspondências perfeitas)</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="bg-emerald-800 text-white text-xs px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-950 transition shadow-sm"
                    >
                      Salvar Customizações do Bot
                    </button>
                  </form>
                </div>


                {/* Sources Data Management Panel */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-800" />
                      Gerenciador de Fontes do Portal
                    </h4>
                    <p className="text-xs text-slate-500">Cadastre links do portal proex.ifes.edu.br para raspagem automática ou digite o texto de portarias e editais antigos em PDF</p>
                  </div>

                  {sourceActionMessage && (
                    <div className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                      sourceActionMessage.type === "success" 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                        : "bg-red-50 text-red-800 border-red-200"
                    }`}>
                      <span className="mt-0.5 font-bold">{sourceActionMessage.type === "success" ? "✓" : "⚠"}</span>
                      <p>{sourceActionMessage.text}</p>
                    </div>
                  )}

                  {/* Form to insert source */}
                  <form onSubmit={handleAddSource} className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Tipo de Documento:</label>
                        <select
                          value={newSourceType}
                          onChange={(e) => setNewSourceType(e.target.value as "url" | "text")}
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                        >
                          <option value="url">Endereço de Portal Web (Crawl)</option>
                          <option value="text">Documento Texto (PDF/DOCX - Colado)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Título de Identificação:</label>
                        <input
                          type="text"
                          value={newSourceTitle}
                          onChange={(e) => setNewSourceTitle(e.target.value)}
                          placeholder="Ex: Regulamento de Matrícula FIC 2026"
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">
                        {newSourceType === "url" ? "Endereço URL Completo:" : "Texto Completo do Edital:"}
                      </label>
                      {newSourceType === "url" ? (
                        <input
                          type="url"
                          value={newSourceValue}
                          onChange={(e) => setNewSourceValue(e.target.value)}
                          placeholder="https://proex.ifes.edu.br/..."
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono"
                          required
                        />
                      ) : (
                        <textarea
                          rows={4}
                          value={newSourceValue}
                          onChange={(e) => setNewSourceValue(e.target.value)}
                          placeholder="Cole aqui as cláusulas do edital, contatos, anexos de bolsas..."
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono"
                          required
                        />
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isAddingSource}
                      className="bg-emerald-800 text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-emerald-900 transition flex items-center gap-1 shadow-sm"
                    >
                      {isAddingSource ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span>Cadastrar Nova Fonte</span>
                    </button>
                  </form>

                  {/* Table review of current registered sources */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Fontes Atualmente Monitoradas</span>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {sources.map((s) => (
                        <div key={s.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-2.5 truncate">
                            {s.type === "url" ? (
                              <Globe className="w-4 h-4 text-emerald-800 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                            )}
                            <div className="truncate">
                              <h5 className="font-semibold text-slate-800">{s.title}</h5>
                              <p className="text-[10px] text-slate-400 font-mono shrink-0 truncate">{s.value}</p>
                            </div>
                          </div>
                          {deletingSourceId === s.id ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleDeleteSource(s.id)}
                                className="bg-red-650 hover:bg-red-800 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition shadow-sm"
                                title="Confirmar exclusão"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setDeletingSourceId(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] border border-slate-200 transition font-medium"
                                title="Cancelar exclusão"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingSourceId(s.id)}
                              className="text-red-650 hover:text-red-800 p-1 rounded-lg hover:bg-red-50 transition"
                              title="Remover fonte"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

              {/* Training RAG Center (Col span 1) */}
              <div className="space-y-6">
                
                {/* Embedded RAG Statistics */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Database className="w-4 h-4 text-emerald-800" />
                    Status da Indexação RAG
                  </h4>
                  <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-150">
                    <div className="flex justify-between text-slate-600">
                      <span>Total de trechos (Chunks):</span>
                      <span className="font-bold font-mono text-slate-950">{ragStatus.chunkCount}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Trechos indexados com Vetor:</span>
                      <span className="font-bold font-mono text-slate-950">{ragStatus.embeddedCount}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Provedor de Busca:</span>
                      <span className="font-bold font-mono text-emerald-800">{ragStatus.hasApiKey ? "Vetor (Google)" : "Palavras-chave (Léxica)"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 border-t border-slate-200 pt-2.5">
                      <div className={`w-2 h-2 rounded-full ${ragStatus.hasApiKey ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      <span>{ragStatus.hasApiKey ? "Chave API Ativa: RAG Vetorial disponível." : "Chave API não identificada: usando Fallback de correspondência léxica."}</span>
                    </div>
                  </div>

                  {/* Action core train button */}
                  <button
                    onClick={handleTrainRAG}
                    disabled={isTraining}
                    className="w-full bg-emerald-800 text-white font-semibold rounded-xl text-xs py-3 hover:bg-emerald-950 active:scale-98 transition flex items-center justify-center gap-2 shadow-md disabled:bg-slate-350 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isTraining ? 'animate-spin' : ''}`} />
                    <span>{isTraining ? "Treinando e Indexando..." : "Atualizar Base de Dados"}</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    * O treinamento dispara o scraper para ler os portais cadastrados, limpar o HTML, fracionar o texto em pequenos pedaços e gerar embeddings de similaridade.
                  </p>
                </div>

                {/* Live Training Sequence Logs Panel */}
                <div className="bg-slate-950 rounded-2xl p-4 shadow-md font-mono text-[10px] text-slate-300 space-y-2 border border-slate-800">
                  <div className="flex justify-between items-center text-slate-500 border-b border-slate-800 pb-1.5 mb-1.5">
                    <span className="uppercase font-bold tracking-wider">Console de Treinamento RAG</span>
                    <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">Log Ativo</span>
                  </div>
                  
                  {/* Visual multisteppers */}
                  {isTraining && (
                    <div className="space-y-1.5 text-[10px] text-slate-200 border-b border-slate-800 pb-2.5 mb-2.5 bg-slate-900/30 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${currentTrainingStep >= 1 ? 'bg-emerald-500' : 'bg-slate-600 animate-pulse'}`} />
                        <span className={currentTrainingStep === 1 ? 'text-emerald-400 font-bold' : ''}>[Passo 1/5] Lendo fontes e URLs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${currentTrainingStep >= 2 ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        <span className={currentTrainingStep === 2 ? 'text-emerald-400 font-bold' : ''}>[Passo 2/5] Filtragem e Limpeza HTML</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${currentTrainingStep >= 3 ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        <span className={currentTrainingStep === 3 ? 'text-emerald-400 font-bold' : ''}>[Passo 3/5] Chunking de parágrafos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${currentTrainingStep >= 4 ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        <span className={currentTrainingStep === 4 ? 'text-emerald-400 font-bold' : ''}>[Passo 4/5] Matriz de Embeddings Vetoriais</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${currentTrainingStep >= 5 ? 'bg-emerald-500 animate-bounce' : 'bg-slate-600'}`} />
                        <span className={currentTrainingStep === 5 ? 'text-emerald-400 font-bold' : ''}>[Passo 5/5] Reconstruindo Banco de Dados</span>
                      </div>
                    </div>
                  )}

                  {/* Logs printer */}
                  <div className="max-h-56 overflow-y-auto space-y-1 word-wrap break-all leading-normal text-slate-400 font-mono">
                    {trainingLogs.length > 0 ? (
                      trainingLogs.map((log, index) => (
                        <div key={index} className={log.includes("Erro") || log.includes("❌") ? "text-red-400" : log.includes("Sucesso") || log.includes("vetores") ? "text-emerald-400" : ""}>
                          {log}
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-650 italic">Nenhum evento registrado. Clique em "Atualizar Base de Dados" acima para popular o índice vetorial ao vivo.</span>
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          ))}

        </AnimatePresence>
      </main>

      {/* Footer Credentials */}
      <footer className="bg-slate-900 text-slate-450 text-xs py-4 border-t border-slate-800 text-center select-none text-slate-400 tracking-tight">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 Instituto Federal do Espírito Santo (Ifes) — Todos os direitos reservados.</p>
          <p className="text-[10px] font-mono text-slate-500">Servidores Cloud Native Workspace • RAG Index Engine ativo</p>
        </div>
      </footer>
    </div>
  );
}
