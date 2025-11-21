import { randomUUID } from 'crypto';

export interface Quote {
    provider: 'Raydium' | 'Meteora';
    price: number;
}

export class MockDexRouter {
    private async sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private getRandomPrice(basePrice: number, variancePercent: number): number {
        const variance = basePrice * (variancePercent / 100);
        const randomVariance = (Math.random() * variance * 2) - variance;
        return basePrice + randomVariance;
    }

    async getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote> {
        await this.sleep(200);
        // Simulate base price logic (simplified)
        const basePrice = 100;
        const price = this.getRandomPrice(basePrice, 5); // 5% variance
        return { provider: 'Raydium', price };
    }

    async getMeteoraQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote> {
        await this.sleep(200);
        const basePrice = 100;
        const price = this.getRandomPrice(basePrice, 5); // 5% variance
        return { provider: 'Meteora', price };
    }

    async executeSwap(dex: 'Raydium' | 'Meteora', orderId: string): Promise<{ txHash: string; finalPrice: number }> {
        // Simulate network delay
        await this.sleep(2500); // 2-3 seconds delay

        const txHash = `0x${randomUUID().replace(/-/g, '')}`;
        // Final price might slightly differ from quote
        const finalPrice = this.getRandomPrice(100, 1);

        return { txHash, finalPrice };
    }
}
