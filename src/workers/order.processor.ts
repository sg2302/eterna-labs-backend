import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { MockDexRouter } from '../services/dex.service';

const prisma = new PrismaClient();
const redisPub = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
});

const dexRouter = new MockDexRouter();

// Helper for structured logging
const log = (level: 'info' | 'error', message: string, data: any = {}) => {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...data
    }));
};

const updateStatus = async (orderId: string, status: any, data: any = {}) => {
    await prisma.order.update({
        where: { id: orderId },
        data: { status, ...data },
    });

    const message = JSON.stringify({ status, ...data });
    await redisPub.publish(`order:${orderId}`, message);
};

export const orderProcessor = async (job: Job) => {
    const { orderId } = job.data;
    log('info', 'Processing Order Started', { orderId });

    try {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new Error('Order not found');

        // Step A: Routing
        await updateStatus(orderId, 'routing');
        log('info', 'Fetching Quotes', { orderId, tokenIn: order.tokenIn, tokenOut: order.tokenOut });

        const [raydiumQuote, meteoraQuote] = await Promise.all([
            dexRouter.getRaydiumQuote(order.tokenIn, order.tokenOut, order.amount),
            dexRouter.getMeteoraQuote(order.tokenIn, order.tokenOut, order.amount),
        ]);

        const bestQuote = raydiumQuote.price > meteoraQuote.price ? raydiumQuote : meteoraQuote;

        log('info', 'Routing Decision Made', {
            orderId,
            selectedProvider: bestQuote.provider,
            selectedPrice: bestQuote.price,
            quotes: {
                Raydium: raydiumQuote.price,
                Meteora: meteoraQuote.price
            }
        });

        // Publish routing details to frontend (Redis only, no DB update)
        const routingDetailsMsg = JSON.stringify({
            status: 'routing_details',
            quotes: {
                Raydium: raydiumQuote.price,
                Meteora: meteoraQuote.price
            },
            bestProvider: bestQuote.provider,
            bestPrice: bestQuote.price
        });
        await redisPub.publish(`order:${orderId}`, routingDetailsMsg);

        const decisionLog = `Selected ${bestQuote.provider}: Price ${bestQuote.price} vs ${raydiumQuote.provider === bestQuote.provider ? 'Meteora' : 'Raydium'}: ${raydiumQuote.provider === bestQuote.provider ? meteoraQuote.price : raydiumQuote.price}`;

        await prisma.order.update({
            where: { id: orderId },
            data: {
                dexProvider: bestQuote.provider,
                logs: [decisionLog] as any
            }
        });

        // Step C: Building -> Submitted
        await updateStatus(orderId, 'building');
        log('info', 'Building Transaction', { orderId });

        await new Promise(r => setTimeout(r, 500)); // Mock building time

        await updateStatus(orderId, 'submitted');
        log('info', 'Transaction Submitted', { orderId });

        // Step D: Execute Swap
        const executionResult = await dexRouter.executeSwap(bestQuote.provider, orderId);

        // Step E: Confirmed
        await updateStatus(orderId, 'confirmed', {
            txHash: executionResult.txHash,
            executionPrice: executionResult.finalPrice
        });

        log('info', 'Order Completed Successfully', {
            orderId,
            txHash: executionResult.txHash,
            finalPrice: executionResult.finalPrice
        });

    } catch (error: any) {
        log('error', 'Order Failed', { orderId, error: error.message });
        await updateStatus(orderId, 'failed', { error: error.message });
        throw error; // Trigger BullMQ retry
    }
};
