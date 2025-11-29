import net from 'net';

const clients = new Map();
const usernames = new Set();

const SERVER_VERSION = "1.0.0";

const send = (socket, type, body) => {
    socket.write(`${type} ${JSON.stringify(body)}\n`);
}

const isValidUsername = (name) => {
    return /^[A-Za-z0-9_]{3,14}$/.test(name);
}

const server = net.createServer((socket) => {
    console.log('Client connected.');

    send(socket, 'HI', { version: SERVER_VERSION });

    socket.on("data", (data) => {
        const messages = data.toString().split(/\r?\n/).filter(m => m.trim() !== '');

        for (const message of messages) {
            handleMessage(socket, msg);
        }
    });

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

const handleMessage = (socket, msg) => {
    const spaceIdx = msg.indexOf(' ');
    if (spaceIdx === -1) return; // Invalid

    const command = msg.subString(0, spaceIdx);
    const payloadStr = msg.subString(spaceIdx + 1);

    let payload;

    try {
        payload = JSON.parse(payloadStr);
    } catch {
        // Invalid message body
        send(socket, "PARSE_ERROR", {});
        return;
    }

    // Perhaps this could be done better with a switch case when it scales?
    if (command === "LOGIN") {
        handleLogin(socket, payload);
    } else {
        send(socket, "UNKNOWN_COMMAND", {});
    }
}

const handleLogin = (socket, { username }) => {
    if (clients.has(socket)) {
        return send(socket, 'LOGIN_RESP', {
            status: 'ERROR',
            code: 5000,
            description: 'Already logged in'
        });
    }

    if (!isValidUsername(username)) {
        return send(socket, 'LOGIN_RESP', {
            status: 'ERROR',
            code: 5001,
            description: 'Username has an invalid format or length'
        });
    }

    if (usernames.has(username)) {
        return send(socket, 'LOGIN_RESP', {
            status: 'ERROR',
            code: 5002,
            description: 'User with this name already exists'
        });
    }

    clients.set(socket, { username });
    usernames.add(username);

    send(socket, 'LOGIN_RESP', { status: 'OK' });

    // Notify others
    for (const [otherSocket] of clients) {
        if (otherSocket !== socket) {
            send(otherSocket, 'JOINED', { username });
        }
    }
}

server.listen(1337, () => {
    console.log('Server listening on TCP port 1337');
});