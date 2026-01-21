import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ILLMProvider {
  generateJSON(prompt: string, fileData?: { data: string, mimeType: string }): Promise<any>;
  generateEmbedding(text: string): Promise<number[]>;
}

class GeminiProvider implements ILLMProvider {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private embeddingModel: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    this.embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
  }

  async generateJSON(prompt: string, fileData?: { data: string, mimeType: string }): Promise<any> {
    const parts: any[] = [prompt];
    if (fileData) {
      parts.push({ inlineData: { data: fileData.data, mimeType: fileData.mimeType } });
    }
    const result = await this.model.generateContent(parts);
    const text = result.response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.embeddingModel.embedContent(text);
    return result.embedding.values;
  }
}

class MockProvider implements ILLMProvider {
  async generateJSON(prompt: string): Promise<any> {
    console.log("⚠️ MOCK LLM CALLED");
    return { summary: "Mock Summary", tags: ["mock", "test"] };
  }
  async generateEmbedding(text: string): Promise<number[]> {
    return new Array(768).fill(0.1); // Vector dummy
  }
}

export class LLMFactory {
  static getProvider(): ILLMProvider {
    const providerType = process.env.AI_PROVIDER || 'GEMINI';
    
    switch (providerType) {
      case 'OPENAI':
        throw new Error("OpenAI not implemented yet"); // Aquí iría la clase de OpenAI
      case 'MOCK':
        return new MockProvider();
      case 'GEMINI':
      default:
        return new GeminiProvider(process.env.GEMINI_API_KEY || '');
    }
  }
}