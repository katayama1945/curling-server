//サーバーの起動方法
//PowerShell　起動
//cd C:\Users\katayama\Documents\Curling\web\project
//node server.js

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
// server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

let clients = [];
let status = "idle"; // 状態: idle → waiting → playing
let waitingPlayer = null;

    wss.on('connection', ws => {
        clients.push(ws);
        console.log("新しい接続");

        // 初期状態を送る
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
                    // ここでゲームの準備スタートとか
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
        clients.forEach(c => c.send(msg));
    }

app.use(express.static('public')); // クライアント側を入れるフォルダ
// ←index.htmlを省略しても開く！
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

io.on('connection', (socket) => {
    console.log('🔌 接続:', socket.id);

    socket.on('stoneThrow', (data) => {
        console.log('🎯 投擲データ:', data);
        socket.broadcast.emit('stoneUpdate', data); // 他のプレイヤーに送信
    });

    socket.on('chat', (msg) => {
        io.emit('chat', msg); // 全員にチャットを送信
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`🚀 サーバー起動 http://localhost:${port}`);
});
