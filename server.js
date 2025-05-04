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

// WebSocket 処理
wss.on('connection', ws => {
    clients.push(ws);
    console.log("🌐 新しい接続");

    ws.send(JSON.stringify({ type: "status", status }));

    ws.on('message', msg => {
        const data = JSON.parse(msg);

        if (data.type === "join") {
            if (status === "idle") {
                waitingPlayer = ws;
                status = "waiting";
                broadcast({ type: "status", status });
            } else if (status === "waiting" && ws !== waitingPlayer) {
                status = "playing";
                broadcast({ type: "status", status });
            }
        }

        if (data.type === "leave") {
            if (status === "waiting" && ws === waitingPlayer) {
                status = "idle";
                waitingPlayer = null;
                broadcast({ type: "status", status });
            }
        }
    });

    ws.on('close', () => {
        clients = clients.filter(c => c !== ws);
        if (ws === waitingPlayer && status === "waiting") {
            status = "idle";
            waitingPlayer = null;
            broadcast({ type: "status", status });
        }
    });
});

function broadcast(data) {
    const msg = JSON.stringify(data);
    clients.forEach(c => {
        try {
            c.send(msg);
        } catch (e) {
            console.warn("送信失敗:", e);
        }
    });
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
