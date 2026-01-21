import { GoogleGenerativeAI } from '@google/generative-ai';

export interface LLMProvider {
  generateStream(prompt: string, systemInstruction?: string): AsyncGenerator<string>;
  generateEmbedding(text: string): Promise<number[]>;
}

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;
  
  public readonly version = "v1.0.0-gemini-flash"; 

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async *generateStream(prompt: string, systemInstruction?: string): AsyncGenerator<string> {
    const model = this.genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: systemInstruction 
    });

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}