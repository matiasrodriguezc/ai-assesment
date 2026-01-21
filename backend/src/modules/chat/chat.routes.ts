import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import * as RagService from '../../services/rag.service';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { PROMPTS } from '../../config/prompts';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

const router = Router();
const prisma = new PrismaClient();
const llm = RagService.getLLMProvider();

const ChatSchema = z.object({
  message: z.string().min(1),
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    
    const { message } = ChatSchema.parse(req.body);
    const userId = authReq.user!.userId;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`event: status\ndata: finding_context\n\n`);
    
    const context = await RagService.retrieveContext(message, userId);

    const systemPrompt = PROMPTS.v1.rag_system(context || "No relevant documents found."); 

    res.write(`event: status\ndata: generating\n\n`);

    const stream = llm.generateStream(message, systemPrompt);

    for await (const chunk of stream) {
      const cleanChunk = JSON.stringify({ text: chunk }); 
      res.write(`data: ${cleanChunk}\n\n`);
    }

    res.write('event: done\ndata: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error("Chat Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
      res.end();
    }
  }
});

router.post('/feedback', authenticateToken, async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    
    const { messageId, isPositive, comment, promptVersion, modelUsed } = req.body;
    
    await prisma.feedback.create({
        data: {
            userId: authReq.user!.userId,
            messageId,
            isPositive,
            comment,
            promptVersion: promptVersion || PROMPTS.current_version,
            modelUsed: modelUsed || 'gemini-2.5-flash'
        }
    });
    res.json({ status: 'ok' });
});

export default router;