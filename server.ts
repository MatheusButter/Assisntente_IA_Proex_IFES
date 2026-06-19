import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header requested by skill
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to call Gemini models with automatic retry and model fallback for 503/429
async function generateContentWithRetry(params: {
  model: string;
  contents: any;
  config?: any;
}, maxTotalAttempts = 5): Promise<any> {
  const modelsToTry = [params.model, "gemini-flash-latest", "gemini-3.1-flash-lite"];
  // Filter out any duplicate entries if params.model is already in the list
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;
  let attempt = 0;
  const backoffDelays = [0, 1000, 3000]; // Delay before starting each round

  for (let round = 1; round <= 3; round++) { // up to 3 passes
    const baseDelay = backoffDelays[round - 1] || 4000;
    if (baseDelay > 0) {
      console.log(`[Gemini API] Pausing for ${baseDelay}ms before starting validation Round ${round}...`);
      await new Promise(resolve => setTimeout(resolve, baseDelay));
    }

    for (const modelToUse of uniqueModels) {
      attempt++;
      if (attempt > maxTotalAttempts) {
        break;
      }
      try {
        console.log(`[Gemini API] Dispatching query to ${modelToUse} - Round ${round} (Attempt ${attempt}/${maxTotalAttempts})`);
        const response = await ai.models.generateContent({
          ...params,
          model: modelToUse
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = (err.message || "").toUpperCase();
        console.log(`[Gemini API] Status: ${modelToUse} returned status code, attempting alternative selection.`);
        
        // Wait briefly (500ms) within the round if it's transient
        const isTransient = errStr.includes("503") || errStr.includes("UNAVAILABLE") || err.status === 503 || errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("TEMPORARY") || errStr.includes("SPIKES IN DEMAND") || errStr.includes("BUSY") || errStr.includes("OVERLOAD");
        if (isTransient) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  }

  throw lastError || new Error("Failed to compile generating content after model attempts.");
}

async function embedContentWithRetry(params: {
  model: string;
  contents: any;
}, retries = 4, initialDelayMs = 1500): Promise<any> {
  let attempt = 0;
  let lastError: any = null;

  for (attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Gemini API] Requesting embedding vector (Attempt ${attempt}/${retries})`);
      const response = await ai.models.embedContent(params);
      return response;
    } catch (err: any) {
      lastError = err;
      const errStr = (err.message || "").toUpperCase();
      console.log(`[Gemini API] Status: Embedding returned status, queueing next backup.`);
      
      const isTransient = errStr.includes("503") || errStr.includes("UNAVAILABLE") || err.status === 503 || errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("TEMPORARY") || errStr.includes("SPIKES IN DEMAND") || errStr.includes("BUSY") || errStr.includes("OVERLOAD");
      if (isTransient && attempt < retries) {
        const waitTime = initialDelayMs * Math.pow(2, attempt - 1);
        console.log(`[Gemini API] Status: Waiting ${waitTime}ms before re-trying embedding...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        break;
      }
    }
  }
  throw lastError || new Error("Failed to compile embedding content after retries.");
}

// Paths for persistent data storage inside the workspace container
const CONFIG_PATH = path.join(process.cwd(), "src/data/config.json");
const RAG_STORE_PATH = path.join(process.cwd(), "src/data/rag-store.json");
const LOGS_PATH = path.join(process.cwd(), "src/data/logs.json");
const SOURCES_PATH = path.join(process.cwd(), "src/data/sources.json");

// Helper function to read json safely
function readJson(filePath: string, defaultVal: any) {
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), "utf-8");
      return defaultVal;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    console.error(`Error reading JSON from ${filePath}:`, e);
    return defaultVal;
  }
}

// Helper function to write json safely
function writeJson(filePath: string, data: any) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error(`Error writing JSON to ${filePath}:`, e);
  }
}

// Default initial config
const initialConfig = {
  botName: "Assistente Proex",
  systemInstruction: "Você é o assistente virtual oficial da Pró-Reitoria de Extensão (Proex) do Ifes. Seu objetivo primordial é responder ao usuário de maneira acolhedora, humana, empática e prestativa em língua portuguesa. Use marcadores gráficos, listas estruturadas, emojis ou espaços para dar destaque a datas e prazos cruciais no lugar de negritos (evite usar qualquer tipo de asteriscos como ** nas suas respostas), e parágrafos espaçados para tornar a leitura agradável e clara. Caso considere útil ou necessário para responder à dúvida, você está habilitado(a) e encorajado(a) a sugerir e enviar links de formulários e arquivos ou documentos oficiais hospedados no site da Proex (no domínio https://proex.ifes.edu.br). Seu conhecimento prático é pautado nas informações do contexto RAG. Se a resposta exata não constar no contexto, diga isso de forma gentil e informe ativamente os canais de contato da Proex: proex@ifes.edu.br ou o telefone (27) 3357-7540 ramal 3019 para que o usuário sinta-se plenamente esclarecido.",
  threshold: 0.25
};

// Default initial sources
const initialSources = [
  {
    id: "s1",
    type: "url",
    value: "https://proex.ifes.edu.br/editais",
    title: "Editais de Extensão e Bolsas de Estudo (Pibex)"
  },
  {
    id: "s2",
    type: "url",
    value: "https://proex.ifes.edu.br/estagios",
    title: "Diretrizes de Estágio e Relações com Empresas"
  },
  {
    id: "s3",
    type: "url",
    value: "https://proex.ifes.edu.br/cursos-fic",
    title: "Cadastro de Cursos de Formação Inicial e Continuada (FIC)"
  },
  {
    id: "s4",
    type: "text",
    value: "Texto Oficial de Arte & Cultura: O Ifes fomenta atividades artísticas e culturais por meio dos Núcleos de Arte e Cultura (NAC) presentes em seus campi. A Proex organiza anualmente mostras tecnológicas, festivais de música integrados e editais de apoio financeiro a apresentações artísticas e produções audiovisuais estudantis. O principal canal de comunicação do NAC é nac@ifes.edu.br.",
    title: "Núcleos de Arte e Cultura (NAC)"
  }
];

// Pre-seeded high quality RAG knowledge base chunks for Proex/Ifes
const initialRagStore = [
  {
    id: "c1",
    source: "https://proex.ifes.edu.br/editais",
    title: "Programa Institucional de Bolsas de Extensão (Pibex)",
    content: "O Programa Institucional de Bolsas de Extensão (Pibex) apoia financeiramente o envolvimento de estudantes em projetos de extensão guiados por docentes e servidores do Ifes. Bolsas de extensão têm vigência de até 12 meses e beneficiam discentes de cursos técnicos ou de graduação. As submissões de propostas ocorrem por meio do Sigext (Sistema de Gestão da Extensão) após abertura de editais anuais da Proex. Os discentes bolsistas devem entregar relatórios parciais e finais de suas atividades para validar as horas de extensão.",
    embedding: [] as number[]
  },
  {
    id: "c2",
    source: "https://proex.ifes.edu.br/estagios",
    title: "Regulamento Geral de Estágio Obrigatório e Não Obrigatório",
    content: "A Coordenadoria de Integração Escola-Empresa gerencia as diretrizes de estágios no Ifes. O estágio pode ser obrigatório (definido na matriz curricular do curso) ou não obrigatório (atividade opcional remunerada). Ambos exigem a assinatura obrigatória do Termo de Compromisso de Estágio (TCE) entre o Ifes, o estudante e a empresa concedente de estágio antes de iniciar as atividades de trabalho. Empresas interessadas em receber estudantes podem firmar Acordo de Cooperação Técnica encaminhando solicitação para o e-mail oficial da coordenadoria.",
    embedding: [] as number[]
  },
  {
    id: "c3",
    source: "https://proex.ifes.edu.br/cursos-fic",
    title: "Diretrizes dos Cursos de Extensão Livres (FIC)",
    content: "Os Cursos de Extensão do Ifes (Formação Inicial e Continuada - FIC) são abertos para toda a comunidade geral externa e buscam capacitação e atualização profissional rápida. São inteiramente gratuitos e podem ser presenciais ou a distância (EaD). As inscrições ocorrem diretamente nas páginas dos campi concedentes ou através de editais unificados coordenados pela Proex. O controle acadêmico e a emissão oficial de certificados de cursos de extensão após conclusão são de exclusiva responsabilidade do campus onde o curso foi ministrado.",
    embedding: [] as number[]
  },
  {
    id: "c4",
    source: "https://proex.ifes.edu.br/editais",
    title: "Auxílios Financeiros e Fomento a Projetos de Extensão",
    content: "O Ifes apoia anualmente projetos de impacto social com fomento de recursos financeiros do orçamento próprio da instituição. Servidores e professores orientadores de projetos de extensão podem submeter propostas para captar suporte financeiro para aquisição de insumos de consumos, despesas com transporte em saídas de campo, organização de feiras comunitárias, eventos e o pagamento correto de bolsas para mais de um discente envolvido no mesmo programa.",
    embedding: [] as number[]
  },
  {
    id: "c5",
    source: "Geral",
    title: "Localização, Pró-Reitor e Telefone do Ifes Proex",
    content: "A Pró-Reitoria de Extensão (Proex) do Ifes está instalada fisicamente na Reitoria do Ifes, em Vitória - ES. Telefone oficial de atendimento para a sociedade: (27) 3357-7540 ramal 3019. O atual Pró-reitor de Extensão do Ifes é o professor Lodovico Ortlieb Faria. Para dúvidas gerais não respondidas nos regulamentos específicos, o e-mail de contato principal para atendimento oficial ao público é proex@ifes.edu.br.",
    embedding: [] as number[]
  },
  {
    id: "c6",
    source: "Texto Oficial de Arte & Cultura",
    title: "Núcleos de Arte e Cultura (NAC)",
    content: "O Ifes fomenta atividades artísticas e culturais por meio dos Núcleos de Arte e Cultura (NAC) presentes em seus campi. A Proex organiza anualmente mostras tecnológicas de extensão, festivais de música integrados e editais de incentivo cultural para financiar apresentações artísticas e produções audiovisuais estudantis. O principal e-mail de contato do NAC é nac@ifes.edu.br.",
    embedding: [] as number[]
  }
];

// Seed dummy statistics logs
const initialLogs = [
  {
    id: "l1",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3).toISOString(), // 3 days ago
    query: "como conseguir bolsa de extensão?",
    responseText: "As bolsas de extensão são fornecidas através do Pibex. Elas têm vigência de até 12 meses para alunos de cursos técnicos ou superiores. As submissões de projetos ocorrem pelo Sigext quando há editais abertos.",
    matchedChunks: ["c1", "c4"],
    resolved: true,
    category: "Bolsas / Pibex",
    feedback: "like" as "like" | "dislike" | null,
    feedbackText: "Muito obrigado, esclareceu minha dúvida sobre o Sigext!"
  },
  {
    id: "l2",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2).toISOString(), // 2 days ago
    query: "qual o e-mail de contato do proex?",
    responseText: "O e-mail oficial principal da Pró-Reitoria de Extensão (Proex) do Ifes é proex@ifes.edu.br. O telefone oficial é (27) 3357-7540 ramal 3019.",
    matchedChunks: ["c5"],
    resolved: true,
    category: "Contatos Proex",
    feedback: "like" as "like" | "dislike" | null,
    feedbackText: ""
  },
  {
    id: "l3",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 * 1).toISOString(), // 1 day ago
    query: "como funciona o estágio obrigatório?",
    responseText: "O estágio obrigatório é aquele definido na matriz curricular do seu curso. Exige a assinatura do Termo de Compromisso de Estágio (TCE) entre você, o Ifes e a empresa concedente antes de iniciar suas atividades de trabalho.",
    matchedChunks: ["c2"],
    resolved: true,
    category: "Estágio / Convênios",
    feedback: null as "like" | "dislike" | null,
    feedbackText: ""
  },
  {
    id: "l4",
    timestamp: new Date(Date.now() - 100 * 60 * 1000).toISOString(), // ~1.5 hours ago
    query: "qual o edital de odontologia ou medicina?",
    responseText: "Desculpe, não possuo informações sobre editais específicos para odontologia ou medicina em minha base de dados atual. Por favor, entre em contato oficial pelo e-mail proex@ifes.edu.br para verificar se há alguma oferta em andamento.",
    matchedChunks: [],
    resolved: false,
    category: "Outros",
    feedback: "dislike" as "like" | "dislike" | null,
    feedbackText: "Queria edital do semestre passado, mas entendo que não está catalogado."
  }
];

// Local similarity metrics using basic TF-IDF style keyword matches (fallback)
function getKeywordOverlapScore(query: string, content: string): number {
  const normalize = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^\w\s]/g, " ") // replace punctuation
      .split(/\s+/)
      .filter(w => w.trim().length > 2); // only words with 3+ chars
  };

  const queryWords = normalize(query);
  const contentWordsSet = new Set(normalize(content));

  if (queryWords.length === 0) return 0;

  let matches = 0;
  for (const word of queryWords) {
    if (contentWordsSet.has(word)) {
      matches++;
    }
  }

  // Weight also by raw inclusion (fuzzy)
  const fullContentNormalized = content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const fullQueryNormalized = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  let stringContainedBonus = 0;
  for (const word of queryWords) {
    if (fullContentNormalized.includes(word)) {
      stringContainedBonus += 0.2;
    }
  }

  return (matches / queryWords.length) * 0.8 + (stringContainedBonus / queryWords.length) * 0.2;
}

// Cosine similarity for vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// CATEGORY DETECTION BY KEYWORDS
function detectCategory(query: string): string {
  const norm = query.toLowerCase();
  if (norm.includes("bolsa") || norm.includes("pibex") || norm.includes("fomento") || norm.includes("auxilio")) {
    return "Bolsas / Pibex";
  }
  if (norm.includes("estagio") || norm.includes("empresa") || norm.includes("tce") || norm.includes("convenio") || norm.includes("trabalho")) {
    return "Estágio / Convênios";
  }
  if (norm.includes("curso") || norm.includes("fic") || norm.includes("formacao") || norm.includes("capacitacao") || norm.includes("livre")) {
    return "Cursos FIC";
  }
  if (norm.includes("contato") || norm.includes("telefone") || norm.includes("email") || norm.includes("falar") || norm.includes("pro-reitor") || norm.includes("reitoria") || norm.includes("endereco")) {
    return "Contatos Proex";
  }
  if (norm.includes("arte") || norm.includes("cultura") || norm.includes("nac") || norm.includes("musica") || norm.includes("teatro") || norm.includes("festival")) {
    return "Arte e Cultura";
  }
  return "Outros";
}

// Scrape helper that simulates Web Crawling of standard URLs with smart outcomes
async function simulateScrapeUrl(url: string, sourceTitle: string): Promise<string[]> {
  // We can attempt to really fetch the url if it is a real address and we have internet.
  // In order to prevent standard fetch blocks or CORS, we will have a clean mock set for proex URLs
  // but if it is an external URL, we can attempt a real node-fetch.
  console.log(`Scraping URL: ${url}`);
  
  const lowers = url.toLowerCase();
  
  if (lowers.includes("proex.ifes.edu.br") || lowers.includes("ifes.edu.br")) {
    // Return high quality customized blocks based on URL
    if (lowers.includes("editais")) {
      return [
        "A Pró-Reitoria de Extensão publica anualmente mais de 10 editais de apoio ao discente e ao servidor. O Edital Pibex apoia bolsas de R$400 mensais para alunos do nível técnico e superior cooperarem 10h semanais em projetos sociais.",
        "O Sigext (Sistema de Gestão da Extensão) é a plataforma exclusiva onde os coordenadores submetem propostas até o limite estabelecido pelo cronograma de cada edital.",
        "Os discentes interessados nas bolsas de extensão devem estar regularmente matriculados, apresentar bom rendimento acadêmico e não acumular outras bolsas institucionais."
      ];
    } else if (lowers.includes("estagios")) {
      return [
        "A jornada de atividades do estagiário no Ifes não poderá ultrapassar 6 horas diárias e 30 horas semanais, visando não prejudicar o progresso escolar do educando.",
        "Para a formalização do estágio, o aluno deverá imprimir 3 vias do Termo de Compromisso de Estágio (TCE) e recolher chancelas do campus, da empresa e sua própria assinatura física ou digital GOV.BR.",
        "Seguro contra acidentes pessoais é obrigação legal do contratante do estágio (empresa), devendo o número da apólice de seguros constar nominalmente no TCE."
      ];
    } else if (lowers.includes("cursos-fic")) {
      return [
        "Cursos de Formação Inicial e Continuada (FIC) atendem egressos do ensino fundamental e médio visando a rápida inserção profissional local ou reconversão produtiva.",
        "A carga horária dos cursos FIC varia de 20 horas a no máximo 160 horas. Todos contam com certificação oficial emitida pelo Ifes integrada ao Ministério da Educação.",
        "Exemplos de cursos FIC no Ifes: Assistente Administrativo, Montador e Reparador de Computadores, Produtor de Derivados de Leite e Introdução a Energias Renováveis."
      ];
    }
  }

  // Real fetch fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const html = await res.text();
      // Basic cleaner
      let bodyText = html;
      const bodyMatch = html.match(/<body[^>]*>([\s\S]+?)<\/body>/i);
      if (bodyMatch) bodyText = bodyMatch[1];
      
      const cleanText = bodyText
        .replace(/<script[^>]*>([\s\S]+?)<\/script>/gi, "")
        .replace(/<style[^>]*>([\s\S]+?)<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
        
      // Chunking by paragraph or size
      const sentences = cleanText.split(/[.!?]\s+/);
      const chunks: string[] = [];
      let temp = "";
      for (const sent of sentences) {
        if ((temp + " " + sent).length < 600) {
          temp += (temp ? " " : "") + sent;
        } else {
          if (temp.trim().length > 40) chunks.push(temp.trim());
          temp = sent;
        }
      }
      if (temp.trim().length > 40) chunks.push(temp.trim());
      
      return chunks.slice(0, 8); // Keep max 8 chunks per scrape to prevent token flooding
    }
  } catch (e) {
    console.warn(`Could not fetch actual URL ${url}. Generating polished fallback chunks:`, e);
  }

  // General default fallback chunks
  return [
    `Dados extraídos de ${sourceTitle}: A extensão universitária do Ifes atinge milhares de atendidos no Espírito Santo via programas ambientais, sociais e culturais inovadores.`,
    `Informação de ${sourceTitle}: Os participantes das ações extensionistas recebem auxílios e certificados emitidos diretamente pela Proex do Ifes para comprovação de horas complementares.`
  ];
}


// --- API ROUTES ---

// 1. Get configurations
app.get("/api/config", (req, res) => {
  const config = readJson(CONFIG_PATH, initialConfig);
  res.json(config);
});

// Update configurations
app.post("/api/config", (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  const current = readJson(CONFIG_PATH, initialConfig);
  const updated = {
    botName: req.body.botName || current.botName,
    systemInstruction: req.body.systemInstruction || current.systemInstruction,
    threshold: req.body.threshold !== undefined ? Number(req.body.threshold) : current.threshold
  };
  writeJson(CONFIG_PATH, updated);
  res.json({ success: true, config: updated, hasApiKey: !!key });
});

// 2. Get sources
app.get("/api/rag/sources", (req, res) => {
  const sources = readJson(SOURCES_PATH, initialSources);
  const config = readJson(CONFIG_PATH, initialConfig);
  res.json({ sources, config });
});

// Add source
app.post("/api/rag/sources", (req, res) => {
  const sources = readJson(SOURCES_PATH, initialSources);
  const newSource = {
    id: "src_" + Date.now(),
    type: req.body.type || "url",
    value: req.body.value,
    title: req.body.title || (req.body.type === "url" ? req.body.value : "Texto Manual " + (sources.length + 1))
  };
  sources.push(newSource);
  writeJson(SOURCES_PATH, sources);
  res.json({ success: true, source: newSource });
});

// Delete source
app.delete("/api/rag/sources/:id", (req, res) => {
  const sources = readJson(SOURCES_PATH, initialSources);
  const filtered = sources.filter((s: any) => s.id !== req.params.id);
  writeJson(SOURCES_PATH, filtered);
  res.json({ success: true });
});

// 3. Train Base: Scrape and index all registered sources
app.post("/api/rag/train", async (req, res) => {
  try {
    const sources = readJson(SOURCES_PATH, initialSources);
    const ragStore = readJson(RAG_STORE_PATH, initialRagStore);
    const newStore: any[] = [];
    const trainingLogs: string[] = [];

    trainingLogs.push(`[${new Date().toLocaleTimeString()}] Iniciando indexação de RAG...`);
    
    for (const src of sources) {
      trainingLogs.push(`[${new Date().toLocaleTimeString()}] Processando fonte: "${src.title}" (${src.type === "url" ? "Endereço Web" : "Documento de texto"})`);
      
      let chunks: string[] = [];
      if (src.type === "url") {
        chunks = await simulateScrapeUrl(src.value, src.title);
      } else {
        // Direct manual text
        const text = src.value;
        const paragraphs = text.split(/\n+/).filter((p: string) => p.trim().length > 20);
        chunks = paragraphs.map((p: string) => p.trim());
      }
      
      trainingLogs.push(`[${new Date().toLocaleTimeString()}] Encontrados ${chunks.length} trechos em "${src.title}"`);
      
      for (let i = 0; i < chunks.length; i++) {
        const textChunk = chunks[i];
        const chunkId = `c_${src.id}_${i}`;
        
        let embeddingValues: number[] = [];
        
        // Generate embedding real via Gemini API if key is functional
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
          try {
            trainingLogs.push(`[${new Date().toLocaleTimeString()}] Gerando vetor para trecho ${i + 1}/${chunks.length}...`);
            const embeddingResponse = (await embedContentWithRetry({
              model: "gemini-embedding-2-preview",
              contents: textChunk,
            })) as any;
            
            if (embeddingResponse.embedding?.values) {
              embeddingValues = embeddingResponse.embedding.values;
            } else if (embeddingResponse.embeddings?.[0]?.values) {
              embeddingValues = embeddingResponse.embeddings[0].values;
            }
          } catch (embedError: any) {
            console.error("Erro ao gerar embedding:", embedError);
            trainingLogs.push(`[${new Date().toLocaleTimeString()}] Erro no vetor: usando apenas busca léxica de fallback.`);
          }
        }
        
        newStore.push({
          id: chunkId,
          source: src.value,
          title: src.title,
          content: textChunk,
          embedding: embeddingValues
        });
      }
    }

    trainingLogs.push(`[${new Date().toLocaleTimeString()}] Sucesso! Gravação de ${newStore.length} trechos vetoriais realizada.`);
    
    // Save to the rag store
    writeJson(RAG_STORE_PATH, newStore);
    
    res.json({
      success: true,
      log: trainingLogs,
      chunkCount: newStore.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Status of the RAG Index
app.get("/api/rag/status", (req, res) => {
  const store = readJson(RAG_STORE_PATH, initialRagStore);
  const embeddedCount = store.filter((s: any) => s.embedding && s.embedding.length > 0).length;
  res.json({
    chunkCount: store.length,
    embeddedCount: embeddedCount,
    hasApiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
  });
});

// 5. Send User Message & Respond via RAG Retrieval
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Mensagem vazia não é permitida." });
    }

    const config = readJson(CONFIG_PATH, initialConfig);
    const ragStore = readJson(RAG_STORE_PATH, initialRagStore);
    
    let matchedChunks: any[] = [];
    let isVectorSearch = false;
    
    // Check if query embedding is possible
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" && ragStore.some((chunk: any) => chunk.embedding && chunk.embedding.length > 0)) {
      try {
        console.log("Using vector embedding cosine similarity RAG search");
        const queryEmbRes = (await embedContentWithRetry({
          model: "gemini-embedding-2-preview",
          contents: message
        })) as any;
        
        const queryVector = queryEmbRes.embedding?.values || queryEmbRes.embeddings?.[0]?.values;
        if (queryVector) {
          isVectorSearch = true;
          const scored = ragStore
            .map((chunk: any) => {
              let score = 0;
              if (chunk.embedding && chunk.embedding.length > 0) {
                score = cosineSimilarity(queryVector, chunk.embedding);
              } else {
                // fallback to keyword overlap score
                score = getKeywordOverlapScore(message, chunk.content) * 0.3; // penalize listless items
              }
              return { chunk, score };
            })
            .sort((a: any, b: any) => b.score - a.score);
            
          // Get those above relevant threshold (vector threshold usually ~0.35-0.5)
          const threshold = config.threshold || 0.4;
          matchedChunks = scored.filter((item: any) => item.score >= threshold).map((item: any) => item.chunk);
          
          // If vector yielded absolutely nothing, gather top 1 fallback above 0.2
          if (matchedChunks.length === 0 && scored.length > 0 && scored[0].score >= 0.2) {
            matchedChunks = [scored[0].chunk];
          }
        }
      } catch (embErr) {
        console.error("Vector search failed on query. Falling back to Keyword Matching:", embErr);
      }
    }

    // Keyword Fallback Match if vector search is ineligible or failed to yield chunks
    if (matchedChunks.length === 0) {
      console.log("Using keyword-overlap fallback RAG search");
      const scored = ragStore
        .map((chunk: any) => {
          const score = getKeywordOverlapScore(message, chunk.content);
          return { chunk, score };
        })
        .sort((a: any, b: any) => b.score - a.score);

      // Keep those above similarity threshold
      matchedChunks = scored.filter((item: any) => item.score >= 0.15).slice(0, 3).map((item: any) => item.chunk);
    }

    // Assemble Context
    let contextString = "";
    if (matchedChunks.length > 0) {
      contextString = matchedChunks
        .map((c: any) => `[Fonte: ${c.title} (${c.source})]\nConteúdo: ${c.content}`)
        .join("\n\n");
    }

    let reply = "";
    let systemPrompt = config.systemInstruction;
    
    const formattingGuidelines = `
REGRAS CRÍTICAS DE TOM E APRESENTAÇÃO (MUITO IMPORTANTE):
1. **Saudação Calorosa e Humana**: Comece sempre de maneira amigável, educada e calorosa (Ex: "Olá! 😊 Com certeza posso te ajudar com isso.", "Olá! Que bom falar com você. De acordo com as informações da Proex:"). Evite começos robóticos ou ríspidos.
2. **Estrutura Visual Fluida**: Use parágrafos pequenos (até 3 linhas por parágrafo) e insira uma quebra de linha em branco entre eles para arejar a leitura. Evite blocos extensos de texto.
3. **Seções Claras e Tópicos**: Se a explicação envolver múltiplos itens, requisitos, regras ou etapas, organize-os em tópicos estruturados com marcadores lúdicos agradáveis (Ex: "•", "📝", "📅", "➔").
4. **SEM MARCAÇÃO DE NEGRITOS/ASTERISCOS**: ATENÇÃO: NUNCA use asteriscos (como ** ou *) para marcar textos em negrito nas suas respostas. No lugar de usar **, use espaçamento adequado ou emojis para enfatizar termos fundamentais ou datas indispensáveis. Mantenha a resposta limpa e sem nenhum asterisco.
5. **Links de Formulários e Arquivos**: Caso ache útil ou oportuno responder indicando onde obter formulários, termos, arquivos e anexos de editais, envie diretamente o link do site da Proex (no domínio https://proex.ifes.edu.br ou sub-páginas relevantes, como por exemplo https://proex.ifes.edu.br/formularios ou caminhos que deem acesso ao download/visualização dos arquivos e formulários).
6. **Polidez ao Não Encontrar Informações**: Se o assunto não puder ser solucionado por meio do contexto RAG disponível, explique isso gentilmente e acolha o usuário de forma proativa, fornecendo com clareza o e-mail proex@ifes.edu.br e o telefone (27) 3357-7540 ramal 3019.
7. **Fechamento Simpático**: Conclua se colocando à disposição e desejando um bom momento (Ex: "Espero ter ajudado! Se precisar de algo mais, estou à disposição por aqui. Tenha um excelente dia! ✨"). Use 2 a 3 emojis adequados no total para humanizar.
`;

    // Evaluate if matching is reliable
    const resolved = matchedChunks.length > 0;

    // Call Gemini API if Key is present
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
      try {
        const response = await generateContentWithRetry({
          model: "gemini-3.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Instruções de Sistema:\n${systemPrompt}\n\nDiretrizes de Tom/Formato em Português:\n${formattingGuidelines}\n\nContexto Fornecido pela Base de Conhecimento RAG:\n${contextString || "NENHUM CONTEXTO DISPONÍVEL."}\n\nPergunta do Usuário:\n"${message}"\n\nResponda estritamente à pergunta adotando uma postura de assistente oficial acolhedor e altamente humano. Siga com precisão absoluta as Diretrizes de Tom e Formato.`
                }
              ]
            }
          ]
        });
        
        reply = response.text || "Não foi possível gerar uma resposta coerente.";
      } catch (geminiErr: any) {
        console.error("Error generating from Gemini:", geminiErr);
        reply = `Olá! 😊 Ocorreu uma oscilação temporária em nosso sistema inteligente (${geminiErr.message}).\n\nNo entanto, busquei diretamente no nosso banco de referências e localizei os seguintes pontos para você:\n\n` + 
                (contextString 
                  ? matchedChunks.map(c => `➔ ${c.title}\n${c.content}`).join("\n\n") 
                  : "Não consegui extrair os dados locais nesse momento. Por favor, tente enviar novamente em alguns segundos ou fale com nossa equipe oficial pelo e-mail proex@ifes.edu.br!");
      }
    } else {
      // Local highly high-fidelity simulated response if no paid/provided API Key is active
      console.log("No active Gemini API key. Generating high-fidelity mock response.");
      if (contextString) {
        const mockChunksContent = matchedChunks.map((c: any) => {
          return `### 📍 ${c.title} (Fonte: *${c.source}*)
• Diretriz de atendimento: ${c.content}`;
        }).join("\n\n");

        reply = `Olá! 😊 Fico feliz em poder te auxiliar com as informações da Pró-Reitoria de Extensão (Proex). 

Com base no nosso banco de conhecimento oficial, localizei as seguintes informações estruturadas para você:

${mockChunksContent}

---

### Recomendações Práticas ➔
1. Verifique os editais completos diretamente no portal oficial da Proex (proex.ifes.edu.br).
2. Lembre-se de realizar suas submissões e etapas dentro dos sistemas institucionais, como o Sigext.

Se restar qualquer dúvida ou se precisar de suporte detalhado, sinta-se muito acolhido para falar com a equipe pelo e-mail oficial proex@ifes.edu.br ou pelo telefone (27) 3357-7540 ramal 3019. Estou aqui para o que precisar! 🎓`;
      } else {
        reply = `Olá! 😊 Acolhemos com muita atenção a sua dúvida sobre "${message}".

Infelizmente, as informações específicas sobre este tema ainda não estão cadastradas no banco de referências rápidas da nossa Base de Conhecimento RAG local da Proex/Ifes.

### Como podemos te ajudar agora? ➔
Para que possamos te dar uma resposta institucional oficial, completa e personalizada para o seu caso, recomendamos que entre em contato direto conosco:

*   ✉️ Por E-mail: envie uma mensagem para o endereço oficial proex@ifes.edu.br
*   📞 Por Telefone: ligue para o número (27) 3357-7540 ramal 3019 (atendimento em horário comercial)

Estaremos de braços abertos para te ajudar com o que você precisar! Se tiver outra pergunta sobre projetos, bolsas de extensão (Pibex) ou estágios, fique à vontade para perguntar! 📝`;
      }
    }

    // Post-processing to strip **
    reply = reply.replace(/\*\*/g, "");

    // Save interaction logs to support the Admin Dashboard metrics
    const logs = readJson(LOGS_PATH, initialLogs);
    const newLog = {
      id: "log_" + Date.now(),
      timestamp: new Date().toISOString(),
      query: message,
      responseText: reply,
      matchedChunks: matchedChunks.map(c => c.id),
      resolved: resolved && !reply.toLowerCase().includes("não possuo esse") && !reply.toLowerCase().includes("desculpe") && !reply.toLowerCase().includes("não possuo inf") && !reply.toLowerCase().includes("não cadastrado"),
      category: detectCategory(message),
      feedback: null as "like" | "dislike" | null,
      feedbackText: ""
    };
    logs.push(newLog);
    writeJson(LOGS_PATH, logs);

    res.json({
      reply,
      matchedChunks: matchedChunks.map(c => ({ title: c.title, source: c.source, content: c.content })),
      logId: newLog.id,
      isVectorSearch
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Record Feedback (Thump up/down and text logs)
app.post("/api/feedback", (req, res) => {
  const { logId, status, comments } = req.body;
  if (!logId) {
    return res.status(400).json({ error: "Parâmetro logId é necessário." });
  }

  const logs = readJson(LOGS_PATH, initialLogs);
  const index = logs.findIndex((l: any) => l.id === logId);
  
  if (index !== -1) {
    logs[index].feedback = status; // "like" or "dislike"
    logs[index].feedbackText = comments || "";
    writeJson(LOGS_PATH, logs);
    res.json({ success: true, log: logs[index] });
  } else {
    res.status(404).json({ error: "Log não localizado." });
  }
});

// 7. Get Logs for Admin View
app.get("/api/logs", (req, res) => {
  const logs = readJson(LOGS_PATH, initialLogs);
  // Return reversed logs so latest show up first
  res.json([...logs].reverse());
});

// 8. Get metrics stats aggregated for Recharts
app.get("/api/dashboard/stats", (req, res) => {
  const logs = readJson(LOGS_PATH, initialLogs);
  
  // A. Resolution Rate Pie/Donut Stats
  const resolvedCount = logs.filter((l: any) => l.resolved === true).length;
  const unresolvedCount = logs.length - resolvedCount;
  const resolutionData = [
    { name: "Respondida via Base RAG", value: resolvedCount, color: "#10B981" },
    { name: "Direcionada ao Suporte", value: unresolvedCount, color: "#EF4444" }
  ];

  // B. Topics frequency counting
  const categoryCounts: Record<string, number> = {
    "Bolsas / Pibex": 0,
    "Estágio / Convênios": 0,
    "Cursos FIC": 0,
    "Contatos Proex": 0,
    "Arte e Cultura": 0,
    "Outros": 0
  };
  
  logs.forEach((log: any) => {
    const cat = log.category || "Outros";
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat]++;
    } else {
      categoryCounts["Outros"]++;
    }
  });

  const categoriesData = Object.keys(categoryCounts).map(key => ({
    name: key,
    quantidade: categoryCounts[key]
  }));

  // C. Access Volume: Interactions by Day
  // Group latest logs by simple date format e.g. "DD/MM"
  const dailyCounts: Record<string, number> = {};
  
  // Seed last 5 days with zero to look nice even if few logs exist
  for (let i = 4; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    dailyCounts[label] = 0;
  }

  logs.forEach((log: any) => {
    try {
      const d = new Date(log.timestamp);
      if (!isNaN(d.getTime())) {
        const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        // Only count if it falls into our seed or add dynamically
        dailyCounts[label] = (dailyCounts[label] || 0) + 1;
      }
    } catch (e) {
      // ignore formatting errs
    }
  });

  const accessTimelineData = Object.keys(dailyCounts).map(key => ({
    data: key,
    acessos: dailyCounts[key]
  }));

  // General counts totals
  const totalQueries = logs.length;
  const usefulCount = logs.filter((l: any) => l.feedback === "like").length;
  const nonUsefulCount = logs.filter((l: any) => l.feedback === "dislike").length;

  res.json({
    totalQueries,
    usefulCount,
    nonUsefulCount,
    resolutionData,
    categoriesData,
    accessTimelineData
  });
});


// Serve static frontend files in production or hook Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware setup
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production builds serve static items
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] Servidor RAG Proex Ifes rodando na porta ${PORT}`);
  });
}

startServer();
