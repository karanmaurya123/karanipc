
export class UIManager {
    constructor(app) {
        this.app = app;
        // Elements
        this.logList = document.getElementById('log-list');
        this.stats = {
            activeProcs: document.getElementById('stat-active-procs'),
            messages: document.getElementById('stat-messages'),
            throughput: document.getElementById('stat-throughput')
        };
        this.inspector = document.getElementById('inspector-details');
    }

    init() {
        // Controls
        document.getElementById('btn-create-proc').addEventListener('click', () => {
            const name = document.getElementById('proc-name').value || 'Proc';
            const role = document.getElementById('proc-role').value;
            const priority = parseInt(document.getElementById('proc-priority').value);
            this.app.processManager.createProcess(name, role, priority);
        });

        document.getElementById('btn-create-channel').addEventListener('click', () => {
            const type = document.getElementById('channel-type').value;
            const id = document.getElementById('channel-id').value || `${type}-${Date.now()}`;
            this.app.ipcHub.createChannel(type, id);
            // Force update to show new channel immediately
            this.app.update(0);
        });

        document.getElementById('btn-start').addEventListener('click', () => this.app.start());
        document.getElementById('btn-pause').addEventListener('click', () => this.app.pause());
        document.getElementById('btn-step').addEventListener('click', () => this.app.step());

        document.getElementById('btn-toggle-encryption').addEventListener('click', (e) => {
            const enabled = this.app.security.toggle();
            e.target.textContent = enabled ? "Disable Encryption" : "Enable Encryption";
            e.target.classList.toggle('active', enabled);
            this.app.ipcHub.logAction('SYS', 'SEC_UPDATE', `Encryption ${enabled ? 'Enabled' : 'Disabled'}`);
        });

        document.getElementById('btn-export-logs').addEventListener('click', () => this.exportLogs());

        // Event Listeners for Custom Events
        window.addEventListener('ipc-log', (e) => this.addLogEntry(e.detail));
        window.addEventListener('process-log', (e) => this.addLogEntry({
            timestamp: Date.now(),
            pid: e.detail.pid,
            action: 'LOG',
            details: e.detail.msg,
            level: 'INFO'
        }));

        window.addEventListener('inspect-entity', (e) => this.inspect(e.detail.type, e.detail.data));

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target));
        });
    }

    updateStats(procCount, msgCount, throughput, time) {
        this.stats.activeProcs.textContent = `Active Processes: ${procCount}`;
        this.stats.messages.textContent = `Messages: ${msgCount}`;
        this.stats.throughput.textContent = `Throughput: ${throughput.toFixed(1)} msg/s`;

        if (time !== undefined) {
            const seconds = Math.floor(time / 1000);
            const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            document.getElementById('clock').textContent = `${h}:${m}:${s}`;
        }

        // Auto-refresh SHM view if active
        if (document.getElementById('tab-shm-view').classList.contains('active')) {
            this.renderSharedMemory();
        }
    }

    addLogEntry(entry) {
        const li = document.createElement('li');
        const time = new Date(entry.timestamp).toLocaleTimeString();
        li.innerHTML = `
            <span class="log-time">[${time}]</span>
            <span class="log-src">PID:${entry.pid || 'SYS'}</span>
            <span class="log-action">${entry.action}</span>: ${entry.details}
        `;
        if (entry.level === 'ERROR') li.style.color = '#f44336';

        this.logList.prepend(li);
        if (this.logList.children.length > 50) this.logList.lastChild.remove();
    }

    switchTab(targetBtn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        targetBtn.classList.add('active');
        const tabId = targetBtn.dataset.tab;
        document.getElementById(`tab-${tabId}`).classList.add('active');

        // Check if we need to render specific views
        if (tabId === 'shm-view') {
            this.renderSharedMemory();
        }
    }

    inspect(type, object) {
        this.switchTab(document.querySelector('button[data-tab="inspector"]'));
        let content = '';
        if (type === 'process') {
            content = `
                <h3>Process ${object.pid}</h3>
                <p><strong>Name:</strong> ${object.name}</p>
                <p><strong>Role:</strong> ${object.role}</p>
                <p><strong>Owner:</strong> ${object.owner || 'system'}</p>
                <p><strong>State:</strong> ${object.state}</p>
                <p><strong>Priority:</strong> ${object.priority}</p>
                <p><strong>CPU Time:</strong> ${object.cpuTime.toFixed(2)}ms</p>
            `;
        } else if (type === 'channel') {
            content = `
                <h3>Channel ${object.id}</h3>
                <p><strong>Type:</strong> ${object.type}</p>
                <p><strong>Owner:</strong> ${object.acl?.owner || 'Public'}</p>
                <p><strong>Messages/Buffer:</strong> ${object.type === 'queue' ? object.queue.length : (object.type === 'pipe' ? object.buffer.length : 'N/A')}</p>
            `;
        }

        this.inspector.innerHTML = content || `<pre>${JSON.stringify(object, null, 2)}</pre>`;
    }

    renderSharedMemory() {
        // ... existing code ...
        // ... 
        // Find first SHM channel for demo
        const shm = this.app.ipcHub.getChannels().find(c => c.type === 'shm');
        const container = document.getElementById('shm-hex-view');

        if (!shm) {
            container.innerHTML = '<div style="padding:10px; color:#888">No Shared Memory Channel Active</div>';
            return;
        }

        // Render first 64 bytes as hex
        let html = '<table style="font-family:monospace; width:100%; border-collapse:collapse;">';
        html += '<tr><th>Offset</th><th>Hex</th><th>ASCII</th></tr>';

        for (let i = 0; i < 64; i += 8) {
            html += '<tr>';
            html += `<td style="color:#888">0x${i.toString(16).padStart(4, '0')}</td>`;

            // Hex
            let hex = '';
            let ascii = '';
            for (let j = 0; j < 8; j++) {
                if (i + j < shm.buffer.length) {
                    const byte = shm.buffer[i + j];
                    hex += byte.toString(16).padStart(2, '0') + ' ';
                    ascii += (byte > 32 && byte < 127) ? String.fromCharCode(byte) : '.';
                }
            }
            html += `<td style="color:#cfd8dc">${hex}</td>`;
            html += `<td style="color:#aeea00">${ascii}</td>`;
            html += '</tr>';
        }
        html += '</table>';
        container.innerHTML = html;
    }

    exportLogs() {
        const logs = this.app.ipcHub.messageLog;
        if (!logs || logs.length === 0) {
            alert("No logs to export.");
            return;
        }
        const json = JSON.stringify(logs, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ipc-logs-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
