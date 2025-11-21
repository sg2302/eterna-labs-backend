import { MockDexRouter } from '../src/services/dex.service';

describe('MockDexRouter', () => {
    let router: MockDexRouter;

    beforeEach(() => {
        router = new MockDexRouter();
    });

    it('should return a Raydium quote with variance', async () => {
        const quote = await router.getRaydiumQuote('SOL', 'USDC', 1);
        expect(quote.provider).toBe('Raydium');
        expect(quote.price).toBeGreaterThan(90);
        expect(quote.price).toBeLessThan(110);
    });

    it('should return a Meteora quote with variance', async () => {
        const quote = await router.getMeteoraQuote('SOL', 'USDC', 1);
        expect(quote.provider).toBe('Meteora');
        expect(quote.price).toBeGreaterThan(90);
        expect(quote.price).toBeLessThan(110);
    });

    it('should execute swap and return txHash', async () => {
        const result = await router.executeSwap('Raydium', 'order-123');
        expect(result.txHash).toBeDefined();
        expect(result.txHash).toMatch(/^0x/);
        expect(result.finalPrice).toBeDefined();
    }, 10000); // Increase timeout for delay

    it('should handle zero amount gracefully (mock logic)', async () => {
        const quote = await router.getRaydiumQuote('SOL', 'USDC', 0);
        expect(quote.price).toBeGreaterThan(0); // Mock always returns price
    });

    it('should handle same token swap (mock logic)', async () => {
        const quote = await router.getMeteoraQuote('SOL', 'SOL', 1);
        expect(quote.price).toBeGreaterThan(0);
    });
});
