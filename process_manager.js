
import { WORKER_CODE } from './worker_source.js';
import { VirtualWorker } from './virtual_worker.js';

export class ProcessManager {
    constructor(ipcHub, security) {
        this.ipcHub = ipcHub;
        this.security = security;
        this.processes = new Map();
        this.nextPid = 1000;
        this.schedulerQueue = [];

        // Detect environment logic: Force Virtual for file protocol or if unsure
        // The error logs suggest Blob workers are failing on file:// despite our check.
        this.useVirtual = true; // Force virtual for stability in this offline environment
        console.log(`Environment: ${window.location.protocol}. Forcing Virtual Workers: ${this.useVirtual}`);

        try {
            if (!this.useVirtual) {
                // Create Blob URL once
                const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
                this.workerUrl = URL.createObjectURL(blob);
            }
        } catch (e) {
            console.error("Failed to init Blob worker, falling back to Virtual", e);
            this.useVirtual = true;
        }
    }

    createProcess(name, role, priority) {
        console.log(`Creating process ${name} (${role})...`);
        const pid = this.nextPid++;

        let worker;
        try {
            if (this.useVirtual) {
                worker = new VirtualWorker();
            } else {
                worker = new Worker(this.workerUrl);
            }
        } catch (e) {
            console.error("Worker creation failed", e);
            return -1;
        }

        const validUsers = ['admin', 'user1', 'user2'];
        const owner = validUsers[Math.floor(Math.random() * validUsers.length)];

        const proc = {
            pid,
            name,
            role,
            owner, // Assigned Owner
            priority,
            worker,
            state: 'READY',
            startTime: Date.now(),
            cpuTime: 0
        };

        worker.onmessage = (e) => this.handleWorkerMessage(proc, e.data);

        this.processes.set(pid, proc);
        this.schedulerQueue.push(pid);

        // Init worker
        if (this.useVirtual) {
            worker.send({ type: 'INIT', payload: { pid, name, role, owner } });
        } else {
            worker.postMessage({ type: 'INIT', payload: { pid, name, role, owner } });
        }

        return pid;
    }

    handleWorkerMessage(proc, data) {
        if (data.type === 'LOG') {
            const event = new CustomEvent('process-log', { detail: { pid: proc.pid, msg: data.content } });
            window.dispatchEvent(event); // Dispatch to UI
        } else if (data.type === 'IPC_REQUEST') {
            // Forward to IPC Hub
            const result = this.ipcHub.handleRequest(proc.pid, proc.owner, data.payload);
            // Send result back if needed ? (Simulating syscall return)
            // proc.worker.postMessage({ type: 'IPC_RESPONSE', payload: result });
        }
    }

    startAll() {
        this.processes.forEach(p => {
            if (p.state !== 'TERMINATED') {
                p.state = 'RUNNING';
                if (this.useVirtual) {
                    p.worker.send({ type: 'RESUME' });
                } else {
                    p.worker.postMessage({ type: 'RESUME' });
                }
            }
        });
    }

    pauseAll() {
        this.processes.forEach(p => {
            if (p.state === 'RUNNING') {
                p.state = 'PAUSED';
                if (this.useVirtual) {
                    p.worker.send({ type: 'STOP' });
                } else {
                    p.worker.postMessage({ type: 'STOP' });
                }
            }
        });
    }

    step() {
        // Simulation step: run one update cycle manually
        this.update(16); // Simulate 16ms
    }

    update(dt) {
        // Update stats
        this.processes.forEach(p => {
            if (p.state === 'RUNNING') {
                p.cpuTime += dt;
            }
        });
    }

    getProcesses() {
        return Array.from(this.processes.values());
    }

    getProcessCount() {
        return this.processes.size;
    }
}
