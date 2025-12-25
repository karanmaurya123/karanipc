
import { ProcessManager } from './process_manager.js';
import { IPCHub } from './ipc_hub.js';
import { Visualizer } from './visualizer.js';
import { UIManager } from './ui.js';
import { SecurityContext } from './security.js';

class App {
    constructor() {
        this.security = new SecurityContext();
        this.ipcHub = new IPCHub(this.security);
        this.processManager = new ProcessManager(this.ipcHub, this.security);
        this.visualizer = new Visualizer('process-graph', 'timeline-canvas');
        this.ui = new UIManager(this);

        this.lastTime = 0;
        this.isRunning = false;
        this.totalTime = 0;
    }

    init() {
        console.log("Initializing IPC Framework...");
        this.ui.init();
        this.loop(0);

        // Initial setup for demo
        this.security.login('admin', 'admin123'); // Auto-login for demo
    }

    start() {
        this.isRunning = true;
        this.processManager.startAll();
    }

    pause() {
        this.isRunning = false;
        this.processManager.pauseAll();
    }

    step() {
        this.processManager.step();
        this.update(16); // Simulate 1 frame
    }

    loop(timestamp) {
        if (this.isRunning) {
            const dt = timestamp - this.lastTime;
            this.totalTime += dt;
            this.update(dt);
        }
        this.lastTime = timestamp;
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Scheduler tick
        this.processManager.update(dt);

        // Visualizer update
        this.visualizer.render(this.processManager.getProcesses(), this.ipcHub.getChannels());

        // Update stats
        this.ui.updateStats(
            this.processManager.getProcessCount(),
            this.ipcHub.getTotalMessages(),
            this.ipcHub.getThroughput(),
            this.totalTime // Pass elapsed time
        );
    }
}

// Global instance
window.app = new App();
window.addEventListener('DOMContentLoaded', () => window.app.init());
