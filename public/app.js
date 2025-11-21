const logsDiv = document.getElementById('logs');
const executeBtn = document.getElementById('executeBtn');

function log(message, type = 'info') {
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    div.style.color = type === 'error' ? 'red' : type === 'success' ? 'green' : 'black';
    logsDiv.appendChild(div);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

async function executeOrder() {
    const tokenIn = document.getElementById('tokenIn').value;
    const tokenOut = document.getElementById('tokenOut').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (!tokenIn || !tokenOut || !amount) {
        log('Please fill all fields', 'error');
        return;
    }

    executeBtn.disabled = true;
    document.getElementById('routingCard').style.display = 'none';
    document.getElementById('raydiumPrice').textContent = 'Checking...';
    document.getElementById('meteoraPrice').textContent = 'Checking...';
    document.getElementById('decisionBox').textContent = '';
    document.getElementById('raydiumBox').style.backgroundColor = 'transparent';
    document.getElementById('meteoraBox').style.backgroundColor = 'transparent';

    log(`Initiating order: ${amount} ${tokenIn} -> ${tokenOut}...`);

    try {
        const res = await fetch('/api/orders/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputToken: tokenIn, outputToken: tokenOut, amount, userId: 'web-client' })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to create order');

        log(`Order Created! ID: ${data.orderId}`, 'success');
        connectWebSocket(data.orderId);

    } catch (err) {
        log(err.message, 'error');
        executeBtn.disabled = false;
    }
}

function connectWebSocket(orderId) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/orders/${orderId}`);

    ws.onopen = () => {
        log('WebSocket Connected. Waiting for updates...', 'success');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.status === 'routing_details') {
            document.getElementById('routingCard').style.display = 'block';

            const rayPrice = data.quotes.Raydium.toFixed(4);
            const metPrice = data.quotes.Meteora.toFixed(4);

            document.getElementById('raydiumPrice').textContent = `$${rayPrice}`;
            document.getElementById('meteoraPrice').textContent = `$${metPrice}`;

            const best = data.bestProvider;
            document.getElementById('raydiumBox').style.borderColor = best === 'Raydium' ? 'green' : '#eee';
            document.getElementById('raydiumBox').style.backgroundColor = best === 'Raydium' ? '#e6ffe6' : 'transparent';

            document.getElementById('meteoraBox').style.borderColor = best === 'Meteora' ? 'green' : '#eee';
            document.getElementById('meteoraBox').style.backgroundColor = best === 'Meteora' ? '#e6ffe6' : 'transparent';

            document.getElementById('decisionBox').textContent = `🚀 Routing to ${best} for best price!`;

            log(`📊 Quotes: Raydium ($${rayPrice}) vs Meteora ($${metPrice})`);
        } else {
            log(`Update [${data.status}]: ${JSON.stringify(data)}`);
        }

        if (data.status === 'confirmed') {
            log(`✅ Swap Confirmed! Tx: ${data.txHash}`, 'success');
            ws.close();
            executeBtn.disabled = false;
        } else if (data.status === 'failed') {
            log(`❌ Swap Failed: ${data.error}`, 'error');
            ws.close();
            executeBtn.disabled = false;
        }
    };

    ws.onerror = (err) => {
        log('WebSocket Error', 'error');
        console.error(err);
    };

    ws.onclose = () => {
        log('WebSocket Disconnected');
    };
}
