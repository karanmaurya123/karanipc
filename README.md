# Comprehensive Inter-Process Communication (IPC) Framework

A realistic, client-side simulation of Operating System IPC mechanisms, built entirely with vanilla JavaScript, HTML, and CSS.

![IPC Framework Screenshot](docs/screenshot.png)

## Overview

This framework simulates a multi-processing environment in the browser. It implements core OS concepts including **Process Scheduling**, **Inter-Process Communication**, and **Kernel-level Security**, visualized in real-time.

It runs entirely offline without a backend explanation, using `VirtualWorker` technology to simulate multi-threading behaviors compatible with the `file://` protocol.

## Key Features

### 1. IPC Mechanisms
*   **Pipes**: Unidirectional data streams with blocking/non-blocking semantics.
*   **Message Queues**: Priority-based messaging with TTL (Time-To-Live).
*   **Shared Memory**: Raw byte-level access simulation with potential race conditions (if not locked).

### 2. Process Management
*   **Scheduler**: Manages process states (READY, RUNNING, WAIT, TERMINATED).
*   **Web Workers**: Each process runs independent logic (simulated via VirtualWorker for local file compatibility).
*   **Ownership**: Processes are assigned owners (`admin`, `user1`, `user2`) to enforce security.

### 3. Security Layer
*   **Access Control Lists (ACLs)**: Granular permission checks for every IPC operation.
    *   *Example: `user1` cannot write to an `admin` owned Pipe.*
*   **Encryption**: Toggleable AES-GCM encryption for secure communication.
*   **Audit Logging**: Detailed system logs tracking every syscall and security violation.

### 4. Interactive Visualization
*   **Real-time Inspector**: Click on Processes or Channels to view internal state (PID, buffer contents, owners).
*   **Dynamic Graph**: SVG-based visualization of the system topology.
*   **Hex View**: Live hex-dump inspection of Shared Memory segments.

## Usage

1.  **Open** `index.html` in any modern web browser.
2.  **Start Simulation**: Click "Start Simulation" in the sidebar.
3.  **Interact**:
    *   **Create Channel**: Add new Pipes or Queues dynamically.
    *   **Inspect**: Click nodes in the graph to see details in the "Inspector" tab.
    *   **Security**: Click "Enable Encryption" to arm the security system and observe "Access Denied" errors in the logs.
    *   **Shared Memory**: Switch to the "Shared Memory" tab to watch processes fight over byte arrays in real-time.

## Architecture

*   `js/app.js`: Main entry point and game loop.
*   `js/process_manager.js`: Handles process lifecycle and scheduling.
*   `js/ipc_hub.js`: The "Kernel" router for all IPC messages.
*   `js/security.js`: Manages Authentication and ACL enforcement.
*   `js/ui.js`: Handles DOM updates and user interaction.
*   `js/visualizer.js`: Renders the system graph state.
*   `js/virtual_worker.js`: A specialized class to simulate Web Workers on the main thread for maximum compatibility.

## Troubleshooting

*   **"Access Denied"**: This is a feature! If Security is enabled, processes can only write to resources they own.
*   **Visuals Stuck**: If the simulation runs too fast, the browser may throttle updates. Click "Pause" or "Step" to debug frame-by-frame.

---

