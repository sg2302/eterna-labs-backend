# High-Frequency Order Execution Engine (Solana DEX Routing)

## Live Demo
**Public URL:** https://eterna-labs-backend-production.up.railway.app

## Overview
This is a backend system that processes user orders, routes them to the best decentralized exchange (DEX) (simulated Raydium/Meteora), and provides real-time updates via WebSockets.

## Architecture
- **Runtime**: Node.js + TypeScript
- **Server**: Fastify (@fastify/websocket)
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL (Order history) + Redis (Active state)
- **ORM**: Prisma

## Design Decisions

### Why Market Order?
We chose **Market Orders** for this MVP to prioritize **speed and immediate execution**, which are the core value propositions of a High-Frequency Trading (HFT) engine. Market orders minimize complexity by removing the need for an internal order book or long-running state management, allowing us to focus on the efficiency of the routing and execution layers.

### Extension Strategy (Limit & Sniper Orders)
To extend this system:
1.  **Limit Orders**: We would introduce a separate **"Price Watcher" service** that subscribes to real-time price feeds (via WebSocket). When a target price is triggered, it would push a job to the existing `trade-queue` for execution.
2.  **Sniper Orders**: We would add a **"Mempool Monitor"** to listen for specific on-chain events (like `LiquidityAdded`). Upon detection, it would immediately inject a high-priority job into the queue, potentially bypassing standard routing logic for speed.

## Prerequisites
- Docker & Docker Compose
- Node.js (v18+)

## Setup & Run

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Start Infrastructure (PostgreSQL + Redis)**
    ```bash
    docker compose up -d
    ```

3.  **Push Database Schema**
    ```bash
    npx prisma db push
    ```

4.  **Start the Server (API + WebSocket)**
    ```bash
    npm run start:server
    ```

5.  **Start the Worker (Order Processor)**
    ```bash
    npm run start:worker
    ```

## API Endpoints

### POST /api/orders/execute
Execute a new order.
**Body:**
```json
{
  "inputToken": "SOL",
  "outputToken": "USDC",
  "amount": 1.5,
  "userId": "user-123"
}
```
**Response:**
```json
{
  "orderId": "uuid..."
}
```

### WebSocket /ws/orders/:orderId
Connect to receive real-time updates for a specific order.

## Testing
Run unit tests:
```bash
npm test
```
