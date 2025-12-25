
export class VirtualWorker {
    constructor(scriptFn) {
        this.onmessage = null;
        this.pid = null;
        this.state = 'INIT';
        this.name = 'VirtualProc';

        // We can't really "run" the string script easily without eval.
        // Instead, we'll implement the logic directly here as a class that mirrors the worker logic.
        // This is a "Simulation" after all.
    }

    send(data) {
        // Receive message from Main Thread
        // Simulate async delay
        setTimeout(() => this.handleMessage(data), 10);
    }

    handleMessage(data) {
        const { type, payload } = data;
        switch (type) {
            case 'INIT':
                this.pid = payload.pid;
                this.name = payload.name;
                this.log(`Process ${this.name} (PID: ${this.pid}) started (Virtual).`);
                this.state = 'RUNNING';
                this.loop();
                break;
            case 'STOP':
                this.state = 'STOPPED';
                break;
            case 'RESUME':
                this.state = 'RUNNING';
                this.loop();
                break;
        }
    }

    log(msg) {
        if (this.onmessage) this.onmessage({ data: { type: 'LOG', content: msg } });
    }

    sendIPC(req) {
        if (this.onmessage) this.onmessage({ data: { type: 'IPC_REQUEST', payload: req } });
    }

    loop() {
        if (this.state !== 'RUNNING') return;

        // Simulate work
        const rand = Math.random();
        if (rand < 0.05) {
            this.sendIPC({
                op: 'WRITE_PIPE',
                target: 'pipe-1',
                data: `Msg from ${this.pid} (Virtual) at ${Date.now()}`
            });
        } else if (rand < 0.1) {
            // Shared Memory Write
            const randOffset = Math.floor(Math.random() * 60); // Random offset in first 60 bytes
            const char = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Random A-Z
            this.sendIPC({
                op: 'WRITE_SHM',
                target: 'shm-1',
                data: { offset: randOffset, content: char }
            });
        }

        // Schedule next tick
        setTimeout(() => this.loop(), 200 + Math.random() * 800);
    }
}
