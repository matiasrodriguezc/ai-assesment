import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const registerUser = async (email: string, password: string) => {
  // 1. Verificar si existe
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error('User already exists');

  // 2. Hashear password
  const passwordHash = await bcrypt.hash(password, 10);

  // 3. Crear usuario
  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  return { id: user.id, email: user.email };
};

export const loginUser = async (email: string, password: string) => {
  // 1. Buscar usuario
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');

  // 2. Comparar password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new Error('Invalid credentials');

  // 3. Generar Token JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );

  return { token, user: { id: user.id, email: user.email } };
};