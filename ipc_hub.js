
export class IPCHub {
    constructor(securityContext) {
        this.security = securityContext;
        this.channels = new Map(); // id -> Channel Instance
        this.messageLog = [];
        this.msgCounter = 0;
        this.throughput = 0;

        // Init default channels
        // Init default channels
        // Admin owned
        this.createChannel('pipe', 'pipe-1', { acl: { owner: 'admin' } });
        // User1 owned (restricted)
        this.createChannel('queue', 'queue-1', { acl: { owner: 'user1' } });
        // Public (no owner implies public?) Or explicit null
        this.createChannel('shm', 'shm-1', { size: 1024, acl: { owner: 'admin' } });
    }

    createChannel(type, id, options = {}) {
        let channel;
        switch (type) {
            case 'pipe': channel = new Pipe(id, options); break;
            case 'queue': channel = new MessageQueue(id, options); break;
            case 'shm': channel = new SharedMemory(id, options); break;
        }
        this.channels.set(id, channel);
        this.logAction('SYSTEM', 'CREATE_CHANNEL', `Created ${type} channel: ${id}`);
        return channel;
    }

    handleRequest(pid, owner, request) {
        const { op, target, data } = request;
        const channel = this.channels.get(target);

        if (!channel) return { error: 'Channel not found' };

        // Access Control
        // Check if the requesting owner has access to the channel
        if (!this.security.checkAccess(channel.acl, op, owner)) {
            this.logAction(pid, op, `Access Denied to ${target}`, 'ERROR');
            return { error: 'Access Denied' };
        }

        let result;
        try {
            switch (op) {
                case 'WRITE_PIPE':
                    result = channel.write(data);
                    this.logAction(pid, op, `Wrote to pipe ${target}`);
                    break;
                case 'READ_PIPE':
                    result = channel.read();
                    // Don't log empty reads to avoid spam
                    if (result) this.logAction(pid, op, `Read from pipe ${target}`);
                    break;
                case 'ENQUEUE':
                    result = channel.enqueue(data);
                    this.logAction(pid, op, `Enqueued message to ${target}`);
                    break;
                case 'DEQUEUE':
                    result = channel.dequeue();
                    if (result) this.logAction(pid, op, `Dequeued from ${target}`);
                    break;
                case 'WRITE_SHM':
                    result = channel.write(data.offset || 0, data.content);
                    this.logAction(pid, op, `Wrote ${data.content.length} bytes to SHM ${target} at ${data.offset}`);
                    break;
            }
        } catch (e) {
            return { error: e.message };
        }

        if (result) this.msgCounter++;
        return result;
    }

    logAction(pid, action, details, level = 'INFO') {
        const entry = {
            id: ++this.msgCounter, // just using this as ID for now
            timestamp: Date.now(),
            pid,
            action,
            details,
            level
        };
        this.messageLog.unshift(entry);
        if (this.messageLog.length > 100) this.messageLog.pop();

        // Dispatch log event
        window.dispatchEvent(new CustomEvent('ipc-log', { detail: entry }));
    }

    getChannels() {
        return Array.from(this.channels.values());
    }

    getTotalMessages() {
        return this.msgCounter;
    }

    getThroughput() {
        // Calculate throughput over last second
        const now = Date.now();
        // Remove old messages > 1s from calculation window
        // Note: For large volume, this is inefficient, but fine for demo
        const recent = this.messageLog.filter(m => now - m.timestamp < 1000).length;

        // Exponential moving average for smoothness? Or just raw count
        // Let's do a simple weighted average if needed, but count/sec is standard
        return recent;
    }
}

class Pipe {
    constructor(id, options) {
        this.id = id;
        this.type = 'pipe';
        this.buffer = [];
        this.capacity = options.capacity || 10;
        this.acl = options.acl || null;
    }

    write(data) {
        if (this.buffer.length >= this.capacity) {
            return false; // Blocking/Full
        }
        this.buffer.push(data);
        return true;
    }

    read() {
        return this.buffer.shift() || null;
    }
}

class MessageQueue {
    constructor(id, options) {
        this.id = id;
        this.type = 'queue';
        this.queue = []; // Array of { priority, data, timestamp }
        this.acl = options.acl || null;
    }

    enqueue(item) {
        // Item expected: { payload, priority, ttl }
        const msg = {
            ...item,
            timestamp: Date.now()
        };
        this.queue.push(msg);
        this.queue.sort((a, b) => b.priority - a.priority); // High priority first
        return true;
    }

    dequeue() {
        // Check TTL
        const now = Date.now();
        while (this.queue.length > 0 && this.queue[0].ttl && now - this.queue[0].timestamp > this.queue[0].ttl) {
            this.queue.shift(); // Expired
        }
        return this.queue.shift() || null;
    }
}

class SharedMemory {
    constructor(id, options) {
        this.id = id;
        this.type = 'shm';
        this.size = options.size || 1024;
        this.buffer = new Uint8Array(this.size);
        this.locks = new Map(); // address -> ownerPID
        this.acl = options.acl || null;
    }

    // Simplistic read/write
    // In real usage, processes would request "lock" then write bytes
    write(offset, data) {
        if (offset < 0 || offset >= this.size) return false;

        // Write byte-by-byte (simulate)
        // Data is string, convert to bytes
        for (let i = 0; i < data.length; i++) {
            if (offset + i < this.size) {
                this.buffer[offset + i] = data.charCodeAt(i);
            }
        }
        return true;
    }
}
