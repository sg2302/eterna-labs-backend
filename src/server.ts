import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { orderRoutes } from './routes/order.routes';
import dotenv from 'dotenv';

import path from 'path';
import fastifyStatic from '@fastify/static';

dotenv.config();

const server = Fastify({
  logger: true,
});

server.register(websocket);
server.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/', // optional: default '/'
});
server.register(orderRoutes);

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on http://0.0.0.0:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
