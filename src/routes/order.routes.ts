import { FastifyInstance } from 'fastify';
import { executeOrder, orderWebSocket } from '../controllers/order.controller';

export async function orderRoutes(fastify: FastifyInstance) {
    fastify.post('/api/orders/execute', executeOrder);

    fastify.get('/ws/orders/:orderId', { websocket: true }, (connection, req) => {
        orderWebSocket(connection, req);
    });
}
