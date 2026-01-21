import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as AuthService from './auth.service';

const router = Router();

// Esquema de validación
const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = AuthSchema.parse(req.body);
    const user = await AuthService.registerUser(email, password);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error registering user' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = AuthSchema.parse(req.body);
    const data = await AuthService.loginUser(email, password);
    res.json(data);
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

export default router;