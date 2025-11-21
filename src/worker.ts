import http from 'http';
import './workers/order.worker';

// Dummy server to keep Render happy (Web Service requirement)
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Worker is running');
});

server.listen(port, () => {
    console.log(`Worker listening on port ${port}`);
});
