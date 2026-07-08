import React, { useMemo } from "react";
import { motion } from "motion/react";
import { AppLog } from "../types";
import { Tag, HelpCircle, RefreshCw } from "lucide-react";

interface WordCloudProps {
  logs: AppLog[];
  onWordClick?: (word: string) => void;
  selectedWord?: string | null;
}

const STOP_WORDS = new Set([
  "o", "a", "os", "as", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "por", "para", "com", "como", "que", "em", "um", "uma", "uns", "umas", "se", "com", "de", "ao", "aos", "eu", "ele", "ela", "você", "voces", "nós", "eles", "elas", "meu", "minha", "meus", "minhas", "seu", "sua", "seus", "suas", "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas", "aquele", "aquela", "aqueles", "aquelas", "isso", "isto", "aquilo", "tem", "ter", "por", "pelo", "pela", "pelos", "pelas", "ser", "são", "era", "fui", "foi", "fazer", "mais", "mas", "bem", "não", "sim", "também", "outros", "outro", "outra", "outras", "sobre", "qual", "quais", "como", "onde", "quando", "quem", "por que", "porque", "então", "num", "numa", "pode", "podem", "esta", "está", "estão", "esteve", "estive", "estiveram", "tenho", "tinha", "terá", "gostaria", "saber", "quero", "queria", "preciso", "ajuda", "duvida", "dúvida", "dúvidas", "duvidas", "informações", "informação", "informacao", "favor", "proex", "ifes", "assistente", "bot", "chat", "chatbot", "olá", "ola", "bom", "dia", "tarde", "noite", "oi", "por favor", "me", "te", "lhe", "nos", "vos", "lhes", "meu", "teu", "seu", "nosso", "vosso", "dele", "dela", "deles", "delas", "está", "estão", "esta", "este", "qualquer", "sobre", "algum", "alguma", "alguns"
]);

export default function WordCloud({ logs, onWordClick, selectedWord }: WordCloudProps) {
  const wordsData = useMemo(() => {
    const frequency: Record<string, number> = {};

    logs.forEach((log) => {
      if (!log.query) return;
      
      // Clean query and split into words
      const cleaned = log.query
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'']/g, " ")
        .replace(/\s+/g, " ");
      
      const words = cleaned.split(" ");
      
      words.forEach((w) => {
        const trimmed = w.trim();
        // Skip short words, numeric strings, and stop words
        if (trimmed.length < 3 || /^\d+$/.test(trimmed) || STOP_WORDS.has(trimmed)) {
          return;
        }
        frequency[trimmed] = (frequency[trimmed] || 0) + 1;
      });
    });

    // Convert to array of objects and sort by frequency
    const list = Object.keys(frequency).map((word) => ({
      text: word,
      value: frequency[word],
    }));

    list.sort((a, b) => b.value - a.value);

    // Keep top 32 words for an elegant visual presentation
    return list.slice(0, 32);
  }, [logs]);

  // Determine scale sizes based on min/max count
  const maxCount = wordsData.length > 0 ? Math.max(...wordsData.map((w) => w.value)) : 1;
  const minCount = wordsData.length > 0 ? Math.min(...wordsData.map((w) => w.value)) : 1;

  const getWordStyle = (count: number) => {
    // Normalize value between 0 and 1
    const normalized = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
    
    // Size and weight levels
    let sizeClass = "text-xs font-normal text-slate-500 hover:text-slate-800";
    let colorClass = "bg-slate-50 border-slate-200 text-slate-600";
    
    if (normalized > 0.8) {
      sizeClass = "text-xl md:text-2xl font-black";
      colorClass = "bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200";
    } else if (normalized > 0.5) {
      sizeClass = "text-lg md:text-xl font-extrabold";
      colorClass = "bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100";
    } else if (normalized > 0.3) {
      sizeClass = "text-sm md:text-base font-semibold";
      colorClass = "bg-indigo-50 border-indigo-150 text-indigo-700 hover:bg-indigo-100";
    } else if (normalized > 0.15) {
      sizeClass = "text-xs md:text-sm font-medium";
      colorClass = "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200";
    }
    
    return { sizeClass, colorClass };
  };

  if (wordsData.length === 0) {
    return (
      <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
        <HelpCircle className="w-5 h-5 mx-auto mb-2 text-slate-350" />
        Nenhum termo relevante extraído dos logs até o momento.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5 justify-center p-6 bg-slate-50/50 rounded-2xl border border-slate-150 min-h-[160px] items-center content-center">
        {wordsData.map((word, idx) => {
          const { sizeClass, colorClass } = getWordStyle(word.value);
          const isSelected = selectedWord === word.text;

          return (
            <motion.button
              key={word.text}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.02, duration: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onWordClick?.(word.text)}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 select-none shadow-sm ${sizeClass} ${
                isSelected
                  ? "bg-emerald-800 border-emerald-900 text-white font-bold hover:bg-emerald-900 shadow-md ring-2 ring-emerald-500/20"
                  : colorClass
              }`}
              title={`Buscado ${word.value} vezes`}
            >
              <span className="capitalize">{word.text}</span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.25 rounded-md ${
                isSelected ? "bg-emerald-700 text-emerald-100" : "bg-black/5 text-black/50"
              }`}>
                {word.value}
              </span>
            </motion.button>
          );
        })}
      </div>
      
      {selectedWord && (
        <div className="flex justify-between items-center bg-emerald-50 text-emerald-900 px-3.5 py-2.5 rounded-xl border border-emerald-150 text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <Tag className="w-3.5 h-3.5 text-emerald-850" />
            Filtrando logs pelo termo: <strong className="capitalize text-emerald-950 font-bold">"{selectedWord}"</strong>
          </span>
          <button
            onClick={() => onWordClick?.("")}
            className="text-[10px] uppercase font-bold text-emerald-700 hover:text-emerald-950 bg-white px-2.5 py-1 rounded-md border border-emerald-200 cursor-pointer shadow-sm flex items-center gap-1 transition"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Limpar Filtro
          </button>
        </div>
      )}
    </div>
  );
}
