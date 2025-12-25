
export class SecurityContext {
    constructor() {
        this.currentUser = null;
        this.cryptoSubtle = window.crypto.subtle;
        this.users = {
            'admin': 'admin123',
            'user1': 'pass1',
            'user2': 'pass2'
        };
        this.enabled = false; // Default off
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    login(username, password) {
        if (this.users[username] === password) {
            this.currentUser = username;
            console.log(`User ${username} logged in.`);
            return true;
        }
        return false;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // ACL Check
    // permissions: { owner: 'user', group: 'group', mode: 'rwx' }
    checkAccess(resourceAcl, operation, requestor) {
        // Master Security Switch
        if (!this.enabled) return true;

        // Current interactive user (Simulating 'root' override or similar if needed)
        // But for IPC, we care about the 'requestor' (the process owner)

        // If no ACL, it's public? Or strict default deny? 
        // Let's say Public for now if undefined.
        if (!resourceAcl) return true;

        if (requestor === 'admin') return true; // Admin superuser
        if (resourceAcl.owner === requestor) return true;

        // Block others
        return false;
    }

    // Crypto Helpers
    async generateKey() {
        return await this.cryptoSubtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }

    async encrypt(data, key) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(data);
        const ciphertext = await this.cryptoSubtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encoded
        );
        return { iv, ciphertext };
    }

    async decrypt(encryptedData, key) {
        const { iv, ciphertext } = encryptedData;
        const decrypted = await this.cryptoSubtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    }
}
