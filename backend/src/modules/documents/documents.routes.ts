import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { documentQueue } from '../../infrastructure/queue';
import { authenticateToken } from '../../middleware/auth.middleware';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ dest: 'uploads/' });

router.post('/', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const doc = await prisma.document.create({
      data: {
        userId: authReq.user!.userId, 
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        status: 'PENDING'
      }
    });

    await documentQueue.add('process-pdf', {
      documentId: doc.id,
      filePath: req.file.path
    });

    res.status(202).json({ 
      message: 'Document uploaded and processing started', 
      documentId: doc.id 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const docs = await prisma.document.findMany({
    where: { userId: authReq.user!.userId },
    orderBy: { createdAt: 'desc' }
  });
  res.json(docs);
});

export default router;