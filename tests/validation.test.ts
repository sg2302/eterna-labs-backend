import { executeOrder } from '../src/controllers/order.controller';
import { FastifyRequest, FastifyReply } from 'fastify';

// Mock dependencies
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        order: {
            create: jest.fn().mockResolvedValue({ id: 'new-order-id' }),
        },
    })),
}));

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        add: jest.fn(),
    })),
}));

jest.mock('ioredis');

describe('Order Controller Validation', () => {
    let mockReq: Partial<FastifyRequest>;
    let mockReply: Partial<FastifyReply>;
    let sendSpy: jest.Mock;
    let statusSpy: jest.Mock;

    beforeEach(() => {
        sendSpy = jest.fn();
        statusSpy = jest.fn().mockReturnThis();
        mockReply = {
            status: statusSpy,
            send: sendSpy,
        };
    });

    it('should return 400 if inputToken is missing', async () => {
        mockReq = { body: { outputToken: 'USDC', amount: 1, userId: 'u1' } };
        await executeOrder(mockReq as FastifyRequest<{ Body: any }>, mockReply as FastifyReply);
        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(sendSpy).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if amount is missing', async () => {
        mockReq = { body: { inputToken: 'SOL', outputToken: 'USDC', userId: 'u1' } };
        await executeOrder(mockReq as FastifyRequest<{ Body: any }>, mockReply as FastifyReply);
        expect(statusSpy).toHaveBeenCalledWith(400);
    });

    it('should return 200 and orderId for valid input', async () => {
        mockReq = { body: { inputToken: 'SOL', outputToken: 'USDC', amount: 1, userId: 'u1' } };
        await executeOrder(mockReq as FastifyRequest<{ Body: any }>, mockReply as FastifyReply);
        expect(sendSpy).toHaveBeenCalledWith({ orderId: 'new-order-id' });
    });
});
