import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Mock BullMQ and Redis
jest.mock('bullmq');
jest.mock('ioredis');

describe('Order Queue', () => {
    let queue: Queue;

    beforeEach(() => {
        queue = new Queue('trade-queue');
    });

    it('should add a job to the queue', async () => {
        const addSpy = jest.spyOn(queue, 'add');
        await queue.add('process-order', { orderId: '123' });
        expect(addSpy).toHaveBeenCalledWith('process-order', { orderId: '123' });
    });
});
