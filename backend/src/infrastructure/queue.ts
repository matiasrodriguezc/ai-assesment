import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Nombre de la cola
export const documentQueue = new Queue('document-processing', { connection: connection as any });

console.log('🚀 Job Queue initialized');