//サーバーの起動方法
//PowerShell　起動
//cd C:\Users\katayama\Documents\Curling\web\project
//node server.js
// server.js 修正版（Render対応）

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app); // HTTPサーバー
const io = socketIO(server); // socket.io用

const wss = new WebSocket.Server({ server }); // ← これが重要！

let clients = [];
let status = "idle";
let waitingPlayer = null;
let playerNames = new Map();  // ← クライアントごとの名前管理

// WebSocket ??? 処理
wss.on('connection', ws => {
    console.log("✅ 新しい WebSocket 接続");
    clients.push(ws);
    // ✅ 初回に接続直後の状態を送る！
    const player1 = waitingPlayer ? playerNames[waitingPlayer] : null;
    const player2 = null;
    const data = {
        type: "status",
        status,
        player1,
        player2
    };
    ws.send(JSON.stringify(data));
    ws.on('message', msg => {
        console.log("✅ 参加要求:", data); // ← これ追加

        const data = JSON.parse(msg);

        if (data.type === "join") {
            playerNames.set(ws, data.name || "匿名");

            if (status === "idle") {
                waitingPlayer = ws;
                status = "waiting";
                broadcastStatus();
            } else if (status === "waiting" && ws !== waitingPlayer) {
                status = "playing";
                broadcastStatus();
            }
        }

        if (data.type === "end") {
            status = "idle";
            waitingPlayer = null;
            broadcastStatus();
        }

        if (data.type === "leave") {
            if (status === "waiting" && ws === waitingPlayer) {
                status = "idle";
                waitingPlayer = null;
                broadcastStatus();
            }
        }
    });

    ws.on('close', () => {
        console.log("❌ WebSocket 接続が切れました");
        clients = clients.filter(c => c !== ws);
        if (ws === waitingPlayer) {
            status = "idle";
            waitingPlayer = null;
        }
        playerNames.delete(ws);
        //delete playerNames[ws];
        broadcastStatus();
    });
});

function broadcastStatus() {
    const player1 = waitingPlayer ? playerNames.get(waitingPlayer) : null;
    let player2 = null;

    if (status === "playing") {
        const others = clients.filter(c => c !== waitingPlayer);
        player2 = others.length > 0 ? playerNames.get(others[0]) : null;

        // player2 = others.length > 0 ? playerNames[others[0]] : null;
    }

    const data = {
        type: "status",
        status,
        player1,
        player2
    };

    const msg = JSON.stringify(data);
    clients.forEach(c => c.send(msg));
}

// クライアントHTML配信
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// socket.io のチャット・投擲処理（オプション）
io.on('connection', (socket) => {
    console.log('🔌 Socket.IO 接続:', socket.id);

    socket.on('stoneThrow', (data) => {
        socket.broadcast.emit('stoneUpdate', data);
    });

    socket.on('chat', (msg) => {
        io.emit('chat', msg);
    });
});

// ポートは Render 用に process.env.PORT を使う
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`🚀 サーバー起動 ポート ${port}`);
});
