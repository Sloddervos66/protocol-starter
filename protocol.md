# Protocol description

This client-server protocol describes the following scenarios:
- Setting up a connection between client and server.
- Broadcasting a message to all connected clients.
- Periodically sending heartbeat to connected clients.
- Disconnection from the server.
- Handling invalid messages.

In the description below, `C -> S` represents a message from the client `C` is sent to server `S`. When applicable, `C` is extended with a number to indicate a specific client, e.g., `C1`, `C2`, etc. The keyword `others` is used to indicate all other clients except for the client who made the request. Messages can contain a JSON body. Text shown between `<` and `>` are placeholders.

The protocol follows the formal JSON specification, RFC 8259, available on https://www.rfc-editor.org/rfc/rfc8259.html

All messages may end using Linux line endings (\n) or windows line endings (\r\n) and client and server should interpret both cases as valid messages.

# 1. Establishing a connection

The client first sets up a socket connection to which the server responds with a welcome message. The client supplies a username on which the server responds with an OK if the username is accepted or an ERROR with a number in case of an error.
_Note:_ A username may only consist of characters, numbers, and underscores ('_') and has a length between 3 and 14 characters.

## 1.1 Happy flow

Client sets up the connection with server.
```
S -> C: HI {"version": "<server version number>"}
```
- `<server version number>`: the semantic version number of the server.

After a while when the client logs the user in:
```
C -> S: LOGIN {"username":"<username>"}
S -> C: LOGIN_RESP {"status":"OK"}
```

- `<username>`: the username of the user that needs to be logged in.

To other clients (Only applicable when working on Level 2):
```
S -> others: JOINED {"username":"<username>"}
```

## 1.2 Unhappy flow
```
S -> C: LOGIN_RESP {"status":"ERROR", "code":<error code>, "description":<description>}
```      
Possible `<error code>`:

| Error code | Description                              |
|------------|------------------------------------------|
| 5000       | Already logged in                        |
| 5001       | Username has an invalid format or length |      
| 5002       | User with this name already exists       |

# 2. Broadcast message

Sends a message from a client to all other clients. The sending client does not receive the message itself but gets a confirmation that the message has been sent.

## 2.1 Happy flow

```
C -> S: BROADCAST_REQ {"message":"<message>"}
S -> C: BROADCAST_RESP {"status":"OK"}
```
- `<message>`: the message that must be sent.

Other clients receive the message as follows:
```
S -> others: BROADCAST {"username":"<username>","message":"<message>"}   
```   
- `<username>`: the username of the user that is sending the message.

## 2.2 Unhappy flow

```
S -> C: BROADCAST_RESP {"status": "ERROR", "code": <error code>, "description":<description>}
```
Possible `<error code>`:

| Error code | Description            |
|------------|------------------------|
| 6000       | User is not logged in  |

# 3. Heartbeat message

Sends a ping message to the client to check whether the client is still active. The receiving client should respond with a pong message to confirm it is still active. If after 3 seconds no pong message has been received by the server, the connection to the client is closed. Before closing, the client is notified with a HANGUP message, with reason code 7000.

The server sends a ping message to a client every 10 seconds. The first ping message is send to the client 10 seconds after the client is logged in.

When the server receives a PONG message while it is not expecting one, a PONG_ERROR message will be returned.

## 3.1 Happy flow

```
S -> C: PING
C -> S: PONG
```     

## 3.2 Unhappy flow

```
S -> C: HANGUP {"reason": <reason code>, "description":<description>}
[Server disconnects the client]
```      
Possible `<reason code>`:

| Reason code | Description      |
|-------------|------------------|
| 7000        | No pong received |    

```
S -> C: PONG_ERROR {"code": <error code>, "description":<description>}
```
Possible `<error code>`:

| Error code | Description         |
|------------|---------------------|
| 8000       | Pong without ping   |    

# 4. Termination of the connection

When the connection needs to be terminated, the client sends a bye message. This will be answered (with a BYE_RESP message) after which the server will close the socket connection.

## 4.1 Happy flow
```
C -> S: BYE
S -> C: BYE_RESP {"status":"OK"}
[Server closes the socket connection]
```

Other, still connected clients, clients receive:
```
S -> others: LEFT {"username":"<username>"}
```

## 4.2 Unhappy flow

- None

# 5. Invalid message header

If the client sends an invalid message header (not defined above), the server replies with an unknown command message. The client remains connected.

Example:
```
C -> S: MSG This is an invalid message
S -> C: UNKNOWN_COMMAND
```

# 6. Invalid message body

If the client sends a valid message, but the body is not valid JSON, the server replies with a pars error message. The client remains connected.

Example:
```
C -> S: BROADCAST_REQ {"aaaa}
S -> C: PARSE_ERROR
```

# 7. User list

Sends a list of all current active users.

## 7.1 Happy Flow
```
C -> S: USER_LIST
S -> C: USER_LIST_RESP {"status":"OK", "users":["<username>", "<username>", ...]}
```

- `<username>`: The name of another user.

## 7.2 Unhappy flow
```
S -> C: USER_LIST_RESP {"status":"ERROR", "code": <error code>, "description":<description>}
```

Possible `<error code>`:

| Error code | Description   |
|------------|---------------|
| 9000       | Not logged in |

# 8 Direct message

Sends a direct message from one user to another user.

## 8.1 Happy flow
```
C -> S: DIRECT_MESSAGE_REQ {"receiver":"<username>", "message":"<message>"}
S -> C: DIRECT_MESSAGE_RESP {"status":"OK"}
```

- `<username>`: The username of the receiver.
- `<message>`: The message that must be sent.

```
S -> Other: DIRECT_MESSAGE {"sender":"<username>", "message":"<message>"}
```

- `<username>`: The username of the sender. 

## 8.2 Unhappy flow
```
S -> C: DIRECT_MESSAGE_RESP {"status":"ERROR", "code":<error code>, "description":<description>}
```

Possible `<error code>`:

| Error code | Description                     |
|------------|---------------------------------|
| 10_000     | Not logged in                   |
| 10_001     | Receiver does not exist         |
| 10_002     | Cannot send message to yourself |

# 9 Heads or Tails

Allows two users to play a game of heads or tails with each other.
The first player to win 3 rounds wins the game (best of 5).
Multiple games can be active at once.

## 9.1 Happy flow

### Invitation
```
C -> S: HEADS_OR_TAILS_INVITE {"receiver":"<username>"}
S -> C: HEADS_OR_TAILS_INVITE_RESP {"status":"OK"}
```

- `<username>`: The username of the user to play a game with.

### Game initialisation
```
S -> Other: HEADS_OR_TAILS_INIT {"sender":"<username>"}
Other -> S: HEADS_OR_TAILS_INIT_REQ {"accepted":<boolean>, "challenger":"<username>"}
S -> Both: HEADS_OR_TAILS_INIT_RESP {"status":"OK"}
```

- `<username>`: The username of the user who asked to play a heads or tails game.
- `<boolean>`: Either `true` to accept or `false` to decline the game

### Game rounds

This is repeated as long as no player has reached 3 points total.

#### Server announces new round
```
S -> Both: HEADS_OR_TAILS_ROUND_START {"current_round":<round number>}
```

- `<round number>`: The number of the current round (1-5).

#### Players make their choices
```
Both -> S: HEADS_OR_TAILS_CHOICE {"choice":<choice>}
S -> FirstClient: HEADS_OR_TAILS_CHOICE_RESP {"status":"OK", "description":"Waiting on other player..."}
```

- `<choice>`: Either `Heads` or `Tails`
- `FirstClient`: The first client to make a choice

#### Round result
```
S -> Both: HEADS_OR_TAILS_RESULT {
    "<username1>": {
        "choice":<choice>,
        "score":<score>  
    },
    "<username2>": {
        "choice":<choice>,
        "score":<score>
    },
    "is_draw":false,
    "coin_result":<result>,
    "round_winner":"<username>",
    "message":"<username> won this round",
    "last_round":<round number>
}
```

- `<username1>`: The username of the player who sent the invitation
- `<username2>`: The username of the player who accepted the invitation
- `<choice>`: Either `Heads` or `Tails`
- `<score>`: Current score of the player (0-3)
- `<result>`: The coin flip result, either `Heads` or `Tails`
- `<username>`: The username of the player who won this round
- `<round number>`: The number of the round that just finished

#### When a player reaches a score of 3
```
S -> Both: HEADS_OR_TAILS_FINAL {
    "winner": "<username>",
    "final_score": {
        "<username1>": <score>,
        "<username2>": <score>
    },
    "total_rounds":<total rounds>,
    "message":"<username> won the game with a score of 3-<opponent score>!"
}
```

- `<username>`: The username of the winner
- `<username1>`: The username of the player who sent the invitation
- `<username2>`: The username of the player who accepted the invitation
- `<score>`: Final score (Winner has 3, loser has 0-2)
- `<total rounds>`: Total number of rounds played (minimum 3, maximum 5)
- `<opponent score>`: The score of the losing player (0, 1 or 2)

## 9.2 Unhappy flow

### Error on invitation
```
S -> C: HEADS_OR_TAILS_INVITE_RESP {"status":"ERROR", "code":<error code>, "description":<description>}
```

Possible `<error code>`:

| Error code | Description                   |
|------------|-------------------------------|
| 11_000     | Not logged in                 |
| 11_001     | Receiver does not exist       |
| 11_002     | Cannot play with yourself     |
| 11_003     | You are already in a game     |
| 11_004     | Receiver is already in a game |

### Error on game initialisation
```
S -> C: HEADS_OR_TAILS_INIT_RESP {"status":"ERROR", "code":<error code>, "description":<description>}
```

Possible `<error code>`:

| Error code | Description                |
|------------|----------------------------|
| 12_000     | Not logged in              |
| 12_001     | Challenger does not exist  |
| 12_002     | No pending invite          |
| 12_003     | Receiver declined request  |
| 12_004     | Receiver went offline      |

### Draw - Both players chose the same side
```
S -> Both: HEADS_OR_TAILS_RESULT {
    "<username1>": {
        "choice":<choice>,
        "score":<score>  
    },
    "<username2>": {
        "choice":<choice>,
        "score":<score>
    },
    "message":"Both players chose <choice>, choose again",
    "last_round":<round number>,
    "is_draw":true
}
```

- `<username1>`: The username of the player who sent the invitation
- `<username2>`: The username of the player who accepted the invitation
- `<choice>`: Either `Heads` or `Tails`
- `<score>`: Current score of the player (0-3)
- `<round number`: The current round number

The round is repeated without incrementing the round number. No points are awarded.

### Player disconnects during the active game
```
S -> Other: HEADS_OR_TAILS_CANCELLED {"reason":"disconnect", "message":"<username> disconnected, game cancelled"}
```

- `<username>`: The username of the player who disconnected.

### Invalid choice errors
```
S -> C: HEADS_OR_TAILS_CHOICE_ERROR {"code":<error code>, "description":<description>}
```

Possible `<error code>`:

| Error code | Description                                |
|------------|--------------------------------------------|
| 13_000     | Not logged in                              |
| 13_001     | Invalid choice, must be `Heads` or `Tails` |
| 13_002     | You are not in an active game              |
| 13_003     | Already submitted a choice                 |