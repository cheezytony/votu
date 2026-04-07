import express from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../dist/create-app.js';

const expressInstance = express();

let isReady = false;

async function bootstrap(): Promise<express.Express> {
  if (!isReady) {
    const app = await createApp(expressInstance);
    await app.init();
    isReady = true;
  }
  return expressInstance;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const server = await bootstrap();
  server(req as express.Request, res as express.Response);
}
