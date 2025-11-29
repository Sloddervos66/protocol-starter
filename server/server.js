/**
 * A VERY SIMPLE TCP SERVER
 * ------------------------
 * This server follows your protocol:
 *
 * 1. Client connects → server sends:  HI {"version": "1.0.0"}
 * 2. Client sends username → "LOGIN {...}"
 * 3. Server checks username validity
 * 4. Sends LOGIN_RESP {status:"OK"} or ERROR
 * 5. Notifies other clients that someone joined
 *
 * IMPORTANT:
 * - This uses ONLY Node.js built-in modules (net).
 * - NO frameworks.
 * - Everything is handled manually.
 */

const net = require('net');

// Store list of connected clients
// We link a socket -> { username }
const clients = new Map();

// Keep a separate set of usernames so we can detect duplicates
const usernames = new Set();

// Server version to send in HI message
const SERVER_VERSION = "1.0.0";

/**
 * Helper function to send messages in the required format
 * 
 * @param {net.Socket} socket 
 * @param {string} type 
 * @param {object} body 
 */
const send = (socket, type, body) => {
    const msgToWrite = `${type} ${JSON.stringify(body)}`;
    console.log(`${socket.localAddress}:${socket.localPort} <-- ${msgToWrite}`);
    socket.write(msgToWrite);
}

/**
 * Validate usernames:
 * - Must be 3-14 characters
 * - Letters, numbers, and underscores only
 *
 * @param {string} name 
 * @returns 
 */
const isValidUsername = (name) => {
    return /^[A-Za-z0-9_]{3,14}$/.test(name);
}

/**
 * Create the TCP server
 */
const server = net.createServer((socket) => {
    console.log('Client connected.');

    // 1) Send HI message as soon as someone connects
    send(socket, 'HI', { version: SERVER_VERSION });

    /**
     * 2) Listen for incoming data from the client
     * Clients may send:
     * LOGIN {"username":"Alatreon"}
     */
    socket.on("data", (data) => {
        const messages = data.toString().split(/\r?\n/).filter(m => m.trim() !== '');

        for (const message of messages) {
            handleMessage(socket, message);
        }
    });

    /**
     * 3) Handle client disconnect
     */
    socket.on("end", () => {
        if (clients.has(socket)) {
            const { username } = clients.get(socket);
            usernames.delete(username);
            clients.delete(socket);

            // Broadcast left to others
            for (const [otherSocket] of clients) {
                send(otherSocket, 'LEFT', { username });
            }

            console.log(`${username} disconnected`);
        }
    });

    socket.on("error", (err) => {
        console.error('Socket error:', err)
    });
});

/**
 * Parse a single protocol message
 * Example: LOGIN {"username":"Alatreon"}
 * 
 * @param {net.Socket} socket 
 * @param {string} msg 
 * @returns 
 */
const handleMessage = (socket, msg) => {
    // Split into command and JSON
    const spaceIdx = msg.indexOf(' ');

    // If no space exists -> invalid message
    // Hmm do we actually want this?
    if (spaceIdx === -1) {
        return send(socket, 'PARSE_ERROR', {});
    }

    const command = msg.substring(0, spaceIdx);
    const payloadStr = msg.substring(spaceIdx + 1);

    let payload;

    try {
        payload = JSON.parse(payloadStr);
    } catch {
        // Invalid message body
        send(socket, "PARSE_ERROR", {});
        return;
    }

    // Only LOGIN is implemented, the rest you will have to do
    // Perhaps this could be done better with a switch case when it scales?
    if (command === "LOGIN") {
        console.log(`${socket.localAddress}:${socket.localPort} --> ${payload}`);
        handleLogin(socket, payload);
    } else {
        // Any other command is unknown
        send(socket, "UNKNOWN_COMMAND", {});
    }
}

/**
 * Handle login requests
 * 
 * @param {net.Socket} socket 
 * @param {object} param1 
 * @returns 
 */
const handleLogin = (socket, { username }) => {
    // 1) Check if already logged in
    if (clients.has(socket)) {
        return send(socket, 'LOGIN_RESP', {
            status: 'ERROR',
            code: 5000,
            description: 'Already logged in'
        });
    }

    // 2) Check username format
    if (!isValidUsername(username)) {
        return send(socket, 'LOGIN_RESP', {
            status: 'ERROR',
            code: 5001,
            description: 'Username has an invalid format or length'
        });
    }

    // 3) Check username is not already taken
    if (usernames.has(username)) {
        return send(socket, 'LOGIN_RESP', {
            status: 'ERROR',
            code: 5002,
            description: 'User with this name already exists'
        });
    }

    // 4) SUCCESS - Store the user
    clients.set(socket, { username });
    usernames.add(username);

    // Reply OK
    send(socket, 'LOGIN_RESP', { status: 'OK' });

    // Broadcast JOINED to all other clients
    for (const [otherSocket] of clients) {
        if (otherSocket !== socket) {
            send(otherSocket, 'JOINED', { username });
        }
    }
}

// Start server
server.listen(1337, () => {
    console.log('Server listening on TCP port 1337');
});