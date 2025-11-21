import { FastifyRequest, FastifyReply } from 'fastify';
// import { SocketStream } from '@fastify/websocket'; // Removed invalid import
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL)
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
    });

const tradeQueue = new Queue('trade-queue', {
    connection: redis,
});

interface ExecuteOrderBody {
    inputToken: string;
    outputToken: string;
    amount: number;
    userId: string; // Assuming userId is passed in body for MVP
}

export const executeOrder = async (req: FastifyRequest<{ Body: ExecuteOrderBody }>, reply: FastifyReply) => {
    const { inputToken, outputToken, amount, userId } = req.body;

    if (!inputToken || !outputToken || !amount || !userId) {
        return reply.status(400).send({ error: 'Missing required fields' });
    }

    try {
        const order = await prisma.order.create({
            data: {
                userId,
                tokenIn: inputToken,
                tokenOut: outputToken,
                amount,
                status: 'pending',
            },
        });

        await tradeQueue.add('process-order', { orderId: order.id }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
        });

        return reply.send({ orderId: order.id });
    } catch (error) {
        req.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
};

export const orderWebSocket = (connection: any, req: FastifyRequest) => {
    const { orderId } = req.params as { orderId: string };
    console.log('WS Connection received. Connection keys:', Object.keys(connection));
    // Handle both SocketStream (connection.socket) and raw WebSocket (connection) cases just in case
    const socket = connection.socket || connection;

    const redisSub = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
    });

    console.log(`Client connected to WS for order: ${orderId}`);

    redisSub.subscribe(`order:${orderId}`, (err) => {
        if (err) {
            console.error('Failed to subscribe: %s', err.message);
            socket.close();
        }
    });

    redisSub.on('message', (channel, message) => {
        if (channel === `order:${orderId}`) {
            socket.send(message);
        }
    });

    socket.on('close', () => {
        console.log(`Client disconnected from WS for order: ${orderId}`);
        redisSub.disconnect();
    });
};
