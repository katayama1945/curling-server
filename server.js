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

app.use(express.static('public')); // クライアント側を入れるフォルダ
// ←ここに以下を追加！
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

server.listen(3000, () => {
    console.log('🚀 サーバー起動 http://localhost:3000');
});
