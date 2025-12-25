
export const WORKER_CODE = `
self.pid = null;
self.state = 'INIT';

const log = (msg) => postMessage({ type: 'LOG', content: msg });

self.onmessage = async (e) => {
    const { type, payload } = e.data;
    switch (type) {
        case 'INIT':
            self.pid = payload.pid;
            self.name = payload.name;
            log(\`Process \${self.name} (PID: \${self.pid}) started.\`);
            self.state = 'RUNNING';
            loop();
            break;
        case 'STOP':
            self.state = 'STOPPED';
            break;
        case 'RESUME':
            self.state = 'RUNNING';
            loop();
            break;
        case 'IPC_RESPONSE':
            break;
    }
};

async function loop() {
    if (self.state !== 'RUNNING') return;
    const action = Math.random();
    if (action < 0.05) {
        postMessage({
            type: 'IPC_REQUEST',
            payload: {
                op: 'WRITE_PIPE',
                target: 'pipe-1', 
                data: \`Msg from \${self.pid}\`
            }
        });
    } else if (action < 0.1) {
        // Shared Memory Write
        const randOffset = Math.floor(Math.random() * 60); // Random offset in first 60 bytes
        const char = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Random A-Z
        postMessage({
            type: 'IPC_REQUEST',
            payload: {
                op: 'WRITE_SHM',
                target: 'shm-1',
                data: { offset: randOffset, content: char }
            }
        });
    }
    setTimeout(loop, 200 + Math.random() * 800);
}
`;
