import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { PiiService } from '../services/pii.service';
import { LLMFactory } from '../services/llm/llmFactory';

const prisma = new PrismaClient();

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

interface JobData {
  documentId: string;
  filePath: string;
}

function detectMimeType(buffer: Buffer): string {
  const signature = buffer.toString('hex', 0, 12).toUpperCase();
  if (signature.startsWith('25504446')) return 'application/pdf';
  if (signature.startsWith('89504E47')) return 'image/png';
  if (signature.startsWith('FFD8FF')) return 'image/jpeg';
  if (signature.startsWith('52494646')) return 'image/webp';
  if (buffer.subarray(0, 500).indexOf(0) === -1) return 'text/plain';
  return 'application/pdf';
}

export const documentWorker = new Worker('document-processing', async (job: Job<JobData>) => {
  const { documentId, filePath } = job.data;
  console.log(`Processing job ${job.id} for document ${documentId}`);

  const llm = LLMFactory.getProvider();

  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' }
    });

    await prisma.auditLog.create({
      data: { action: 'PROCESS_START', status: 'INFO', details: `Started processing document ${documentId}` }
    });

    console.log(`📂 Reading file ${path.basename(filePath)}...`);
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = detectMimeType(fileBuffer);
    const base64Data = fileBuffer.toString('base64');
    
    console.log(`ℹ️ MimeType REAL detected: ${mimeType}`);

    const prompt = `
      You are an expert document analyzer. 
      1. Extract all the content from this file.
      2. Analyze the content and return a JSON object with this exact schema:
      {
        "fullText": "The complete text extracted...",
        "summary": "string (max 2 sentences)",
        "tags": ["string", "string", "string"]
      }
    `;

    console.log("🤖 Sending to LLM (via Factory)...");
    
    let structuredOutput;
    try {
      structuredOutput = await llm.generateJSON(prompt, {
        data: base64Data,
        mimeType: mimeType
      });
    } catch (e) {
      console.error("Error at LLM Factory:", e);
      throw new Error("Failed to generate JSON from LLM");
    }

    let fullText = structuredOutput.fullText || "Text not extracted.";
  
    delete structuredOutput.fullText;

    // --- PII REDACTION ---
    console.log("🕵️  Detecting y Redacting PII...");
    const cleanText = await PiiService.redact(fullText);

    if (structuredOutput.summary) {
        console.log("🧹 Redacting PII from summary...");
        structuredOutput.summary = await PiiService.redact(structuredOutput.summary);
    }
    await prisma.auditLog.create({
        data: { 
            action: 'PII_REDACTION', 
            status: 'SUCCESS', 
            details: `Redacted ${fullText.length - cleanText.length} chars (Original: ${fullText.length})` 
        }
    });
    
    console.log(`🛡️  Length: ${fullText.length} -> ${cleanText.length}`);

    // --- EMBEDDINGS ---
    const chunks = splitText(cleanText, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`🧠 Generating embeddings for ${chunks.length} chunks...`);
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      const vector = await llm.generateEmbedding(chunk);

      await prisma.$executeRaw`
        INSERT INTO "Embedding" ("id", "documentId", "content", "vector", "createdAt")
        VALUES (gen_random_uuid(), ${documentId}, ${chunk}, ${JSON.stringify(vector)}::vector, NOW());
      `;
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { 
        status: 'COMPLETED',
        metadata: structuredOutput,
        content: cleanText 
      }
    });

    await prisma.auditLog.create({
        data: { action: 'PROCESS_COMPLETE', status: 'SUCCESS', details: `Document ${documentId} ready.` }
    });

    console.log(`✅ Document ${documentId} processed successfully.`);

  } catch (error: any) {
    console.error(`❌ Error processing document ${documentId}:`, error);
    
    await prisma.auditLog.create({
        data: { action: 'PROCESS_FAILED', status: 'FAILURE', details: error.message || 'Unknown error' }
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED' }
    });
    throw error;
  }
}, { connection: connection as any });

function splitText(text: string, size: number, overlap: number): string[] {
  const chunks = [];
  if (!text) return [];
  for (let i = 0; i < text.length; i += size - overlap) {
    chunks.push(text.substring(i, i + size));
  }
  return chunks;
}