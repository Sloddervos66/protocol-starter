# Simple TCP Chat — README

A beginner-friendly end-to-end project that implements a small client-server protocol using **plain Node.js TCP server** on the backend and **plain HTML/CSS/JavaScript** for the frontend. Because browsers cannot open raw TCP sockets, a tiny WebSocket → TCP bridge is included so the browser client can communicate with the TCP server.

This README contains step-by-step instructions for getting the project running, designed for people who are comfortable with HTML/CSS/JS but new to backend work.

---

## What this implements

* Sends `HI {"version":"<x.y.z>"}` when a client connects
* Client sends `LOGIN {"username":"<username>"}`
* Server validates username and responds with `LOGIN_RESP {"status":"OK"}` or `LOGIN_RESP {"status":"ERROR", "code":<code>, "description":"..."}`
* The server broadcasts `JOINED {"username":"<username>"}` to others when someone logs in

Usernames must match: `^[A-Za-z0-9_]{3,14}$`.

The code intentionally uses only the Node.js built-in `net` module for the TCP server. The bridge uses the `ws` module because browsers cannot speak raw TCP.

---

## Prerequisites

* Node.js installed (v12+ recommended). Download from [https://nodejs.org/](https://nodejs.org/)
* A terminal / command prompt. If on Windows DO NOT USE powershell.

---

## Installation (1-minute)

1. Open a terminal in the project folder.
2. Install the WebSocket library required by the bridge:

```bash
npm install ws
```

> The `ws` dependency is only used by `bridge.js`. The TCP server (`server.js`) uses only Node’s built-in modules.

---

## Files (quick summary)

* `server.js` — plain TCP server (listens on port **1337**)
* `bridge.js` — WebSocket server (listens on port **8080**) that forwards messages between the browser and the TCP server
* `index.html` — frontend that connects to `ws://localhost:8080` and sends protocol messages like `LOGIN {"username":"Alatreon"}`

---

## How to run (step-by-step)

1. **Start the TCP server** (open a terminal in project root):

```bash
node server.js
```

You should see a console message like `TCP Server running on port 1337`.

2. **Start the WebSocket → TCP bridge** (open a second terminal):

```bash
node bridge.js
```

You should see `WebSocket bridge running on ws://localhost:8080`.

3. **Open the frontend**

* Open `index.html` in your browser (double-click the file or use `File → Open`).
* The page will connect to `ws://localhost:8080` (the bridge).

4. **Login from the frontend**

* Type a username (3-14 chars, letters/numbers/underscores only) and click **Login**.
* The frontend sends `LOGIN {"username":"<name>"}` to the server through the bridge.
* The server replies with `LOGIN_RESP` and the frontend will show the server messages in the page log.

---

## Example terminal output

**server.js** will log when clients connect, login, and disconnect.

**bridge.js** will log bridge connection events.

**index.html** shows a simple log of messages it sends and receives.

---

## Troubleshooting

* **Browser shows connection errors**: Check that `bridge.js` is running and listening on port 8080.
* **Server doesn’t accept username**: Make sure the username matches the allowed pattern: `^[A-Za-z0-9_]{3,14}$`.
* **Port conflicts**: If ports 5000 or 8080 are in use, stop the process using them or change the ports in `server.js` and `bridge.js`.

---

## Notes for beginners

* Browsers cannot open raw TCP sockets - that’s why the bridge is needed. The bridge simply forwards text messages back and forth.
* The protocol uses simple text lines consisting of a command followed by a JSON body. Newlines (`\n` or `\r\n`) separate messages.
* The server code is intentionally simple and synchronous in structure to be easier to read and learn from.

---

# DO NOT FORGET TO GET RID OF THE .gitkeep ONLY ONCE YOU HAVE PUT SOMETHING INSIDE THAT DIRECTORY TO NOT LOSE IT