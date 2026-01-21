import { PrismaClient } from '@prisma/client';
import { GeminiProvider } from '../domain/ai/LLMProvider';
// IMPORTAMOS LOS PROMPTS
import { PROMPTS } from '../config/prompts'; 

const prisma = new PrismaClient();
const llm = new GeminiProvider();

export const retrieveContext = async (query: string, userId: string): Promise<string> => {
  // ESTO NO ES UN TODO, ES CÓDIGO REAL DE PGVECTOR
  const queryVector = await llm.generateEmbedding(query);
  const vectorStr = JSON.stringify(queryVector);

  const results = await prisma.$queryRaw<any[]>`
    SELECT e.content, d.filename
    FROM "Embedding" e
    JOIN "Document" d ON e."documentId" = d.id
    WHERE d."userId" = ${userId}
    ORDER BY e.vector <=> ${vectorStr}::vector ASC
    LIMIT 5;
  `;

  if (results.length === 0) return "";
  return results.map(r => `[Source: ${r.filename}]\n${r.content}`).join("\n\n");
};

// Esta función usa el prompt versionado
export const generateRAGPrompt = (context: string) => {
    return PROMPTS.v1.rag_system(context);
};

export const getLLMProvider = () => llm;