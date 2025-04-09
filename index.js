// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // 允许所有来源，生产环境应限制为你的域名
        methods: ["GET", "POST"]
    }
});

// 游戏房间存储
const rooms = {};

io.on('connection', (socket) => {
    console.log('新用户连接:', socket.id);

    // 处理创建房间
    socket.on('createRoom', (playerName, callback) => {
        const roomId = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomId] = {
            players: [{ id: socket.id, name: playerName, isHost: true }],
            gameState: 'lobby'
        };

        socket.join(roomId);
        callback({ success: true, roomId });
    });

    // 处理加入房间
    socket.on('joinRoom', ({ playerName, roomId }, callback) => {
        if (!rooms[roomId]) {
            return callback({ success: false, message: '房间不存在' });
        }

        rooms[roomId].players.push({ id: socket.id, name: playerName, isHost: false });
        socket.join(roomId);

        // 通知房间内所有玩家更新列表
        io.to(roomId).emit('playersUpdated', rooms[roomId].players);
        callback({ success: true, roomId });
    });

    // 处理开始游戏
    socket.on('startGame', ({ roomId }, callback) => {
        const room = rooms[roomId];
        if (!room) return callback({ success: false, message: '房间不存在' });

        // 分配角色和词汇 (使用你现有的逻辑)
        // ...

        // 更新游戏状态并通知所有玩家
        room.gameState = 'roleAssignment';
        io.to(roomId).emit('gameStateChanged', room.gameState);

        // 为每个玩家分配角色信息
        room.players.forEach(player => {
            io.to(player.id).emit('roleAssigned', {
                role: player.role,
                word: player.word,
                hint: player.hint
            });
        });

        callback({ success: true });
    });

    // 断开连接处理
    socket.on('disconnect', () => {
        console.log('用户断开连接:', socket.id);
        // 从所有房间中移除该玩家
        Object.keys(rooms).forEach(roomId => {
            const room = rooms[roomId];
            room.players = room.players.filter(p => p.id !== socket.id);

            // 如果房间空了，删除房间
            if (room.players.length === 0) {
                delete rooms[roomId];
            } else {
                // 通知剩余玩家更新列表
                io.to(roomId).emit('playersUpdated', room.players);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});