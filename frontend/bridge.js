/**
 * WebSocket → TCP bridge
 *
 * This file allows your HTML page to talk to the TCP server.
 * The browser connects using WebSockets (ws://localhost:8080)
 * This script forwards messages to the TCP server (port 5000)
 */

import net from 'net';
import { WebSocket } from 'ws';

// Start WebSocket server for the browser
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log("Browser connected to WebSocket bridge");

    // Connect to TCP server
    const socket = net.connect(1337, '127.0.0.1');

    // When TCP sends something → forward it to browser
    socket.on('data', (data) => {
        ws.send(data.toString());
    });

    // When browser sends something → forward to TCP server
    ws.on('message', (msg) => {
        socket.write(msg + '\n');
    });

    ws.on('close', () => {
        socket.end();
    });
});

console.log('WebSocket bridge running on ws://localhost:8080');