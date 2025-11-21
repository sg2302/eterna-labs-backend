import WebSocket from 'ws';
import { request } from 'http';

const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

async function createOrder() {
    const postData = JSON.stringify({
        inputToken: 'SOL',
        outputToken: 'USDC',
        amount: 1.5,
        userId: 'test-user-client'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/orders/execute',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise<{ orderId: string }>((resolve, reject) => {
        const req = request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`API Error: ${res.statusCode} ${data}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

async function run() {
    try {
        console.log('1. Creating Order...');
        const { orderId } = await createOrder();
        console.log(`   Order Created: ${orderId}`);

        console.log('2. Connecting to WebSocket...');
        const ws = new WebSocket(`${WS_URL}/ws/orders/${orderId}`);

        ws.on('open', () => {
            console.log('   WebSocket Connected!');
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log('   [WS Update]:', message);

            if (message.status === 'confirmed' || message.status === 'failed') {
                console.log('3. Order Finalized. Closing connection.');
                ws.close();
                process.exit(0);
            }
        });

        ws.on('error', (err) => {
            console.error('   WebSocket Error:', err);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

run();
