import prismaPkg from '@prisma/client';
import { env } from '../../config/env.js';

const { PrismaClient } = prismaPkg;
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
