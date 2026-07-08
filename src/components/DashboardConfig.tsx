import React from "react";
import { 
  Sliders, 
  BookOpen, 
  Plus, 
  RefreshCw, 
  Globe, 
  FileText, 
  Trash2, 
  Database,
  Calendar,
  Clock
} from "lucide-react";
import { BotConfig, Source, RAGStatus } from "../types";

interface DashboardConfigProps {
  botConfig: BotConfig;
  setBotConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  handleSaveConfig: (e: React.FormEvent) => void;
  handleRestoreDefaultConfig: () => void;
  
  // Sources
  sourceActionMessage: { text: string; type: "success" | "error" } | null;
  newSourceType: "url" | "text";
  setNewSourceType: (t: "url" | "text") => void;
  newSourceTitle: string;
  setNewSourceTitle: (t: string) => void;
  newSourceValue: string;
  setNewSourceValue: (v: string) => void;
  handleAddSource: (e: React.FormEvent) => void;
  isAddingSource: boolean;
  sources: Source[];
  deletingSourceId: string | null;
  setDeletingSourceId: (id: string | null) => void;
  handleDeleteSource: (id: string) => void;
  
  // RAG Status & Training
  ragStatus: RAGStatus;
  handleTrainRAG: () => void;
  isTraining: boolean;
  currentTrainingStep: number;
  trainingLogs: string[];
  onToggleWeeklyUpdate?: (enabled: boolean) => void;
}

export default function DashboardConfig({
  botConfig,
  setBotConfig,
  handleSaveConfig,
  handleRestoreDefaultConfig,
  sourceActionMessage,
  newSourceType,
  setNewSourceType,
  newSourceTitle,
  setNewSourceTitle,
  newSourceValue,
  setNewSourceValue,
  handleAddSource,
  isAddingSource,
  sources,
  deletingSourceId,
  setDeletingSourceId,
  handleDeleteSource,
  ragStatus,
  handleTrainRAG,
  isTraining,
  currentTrainingStep,
  trainingLogs,
  onToggleWeeklyUpdate
}: DashboardConfigProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              className="text-xs text-emerald-800 border-b border-emerald-800 hover:text-emerald-950 font-semibold cursor-pointer"
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
                className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-600 bg-slate-50/30 text-slate-800"
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
                className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-600 bg-slate-50/30 leading-relaxed text-slate-800"
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
                className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-600 bg-slate-50/30 font-mono leading-relaxed text-slate-800"
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
              className="bg-emerald-800 text-white text-xs px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-950 transition shadow-sm cursor-pointer"
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
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
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
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-800"
                  required
                />
              ) : (
                <textarea
                  rows={4}
                  value={newSourceValue}
                  onChange={(e) => setNewSourceValue(e.target.value)}
                  placeholder="Cole aqui as cláusulas do edital, contatos, anexos de bolsas..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-800"
                  required
                />
              )}
            </div>

            <button
              type="submit"
              disabled={isAddingSource}
              className="bg-emerald-800 text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-emerald-900 transition flex items-center gap-1 shadow-sm cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
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
                        className="bg-red-600 hover:bg-red-800 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition shadow-sm cursor-pointer"
                        title="Confirmar exclusão"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setDeletingSourceId(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] border border-slate-200 transition font-medium cursor-pointer"
                        title="Cancelar exclusão"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingSourceId(s.id)}
                      className="text-red-650 hover:text-red-800 p-1 rounded-lg hover:bg-red-50 transition cursor-pointer"
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

            {/* Scheduler Status Section */}
            {ragStatus.scheduler && (
              <div className="border-t border-slate-250 pt-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                    Sincronização Semanal Autônoma:
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={ragStatus.scheduler.weeklyUpdateEnabled}
                      onChange={(e) => onToggleWeeklyUpdate?.(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-800"></div>
                  </label>
                </div>
                
                <div className="space-y-1 text-[10px] text-slate-500 font-mono">
                  <div className="flex justify-between">
                    <span>Última indexação:</span>
                    <span className="font-semibold text-slate-800">
                      {ragStatus.scheduler.lastTrainTimestamp > 0
                        ? new Date(ragStatus.scheduler.lastTrainTimestamp).toLocaleString("pt-BR")
                        : "Nunca"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Próxima indexação:</span>
                    <span className="font-semibold text-emerald-800">
                      {ragStatus.scheduler.weeklyUpdateEnabled && ragStatus.scheduler.lastTrainTimestamp > 0
                        ? new Date(ragStatus.scheduler.lastTrainTimestamp + 7 * 24 * 60 * 60 * 1000).toLocaleString("pt-BR")
                        : "Desativada"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action core train button */}
          <button
            onClick={handleTrainRAG}
            disabled={isTraining}
            className="w-full bg-emerald-800 text-white font-semibold rounded-xl text-xs py-3 hover:bg-emerald-950 active:scale-95 transition flex items-center justify-center gap-2 shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer animate-none"
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
              <span className="text-slate-600 italic">Nenhum evento registrado. Clique em "Atualizar Base de Dados" acima para popular o índice vetorial ao vivo.</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
