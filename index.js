// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // ����������Դ����������Ӧ����Ϊ�������
        methods: ["GET", "POST"]
    }
});

// ��Ϸ����洢
const rooms = {};

io.on('connection', (socket) => {
    console.log('���û�����:', socket.id);

    // ����������
    socket.on('createRoom', (playerName, callback) => {
        const roomId = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomId] = {
            players: [{ id: socket.id, name: playerName, isHost: true }],
            gameState: 'lobby'
        };

        socket.join(roomId);
        callback({ success: true, roomId });
    });

    // ������뷿��
    socket.on('joinRoom', ({ playerName, roomId }, callback) => {
        if (!rooms[roomId]) {
            return callback({ success: false, message: '���䲻����' });
        }

        rooms[roomId].players.push({ id: socket.id, name: playerName, isHost: false });
        socket.join(roomId);

        // ֪ͨ������������Ҹ����б�
        io.to(roomId).emit('playersUpdated', rooms[roomId].players);
        callback({ success: true, roomId });
    });

    // ����ʼ��Ϸ
    socket.on('startGame', ({ roomId }, callback) => {
        const room = rooms[roomId];
        if (!room) return callback({ success: false, message: '���䲻����' });

        // �����ɫ�ʹʻ� (ʹ�������е��߼�)
        // ...

        // ������Ϸ״̬��֪ͨ�������
        room.gameState = 'roleAssignment';
        io.to(roomId).emit('gameStateChanged', room.gameState);

        // Ϊÿ����ҷ����ɫ��Ϣ
        room.players.forEach(player => {
            io.to(player.id).emit('roleAssigned', {
                role: player.role,
                word: player.word,
                hint: player.hint
            });
        });

        callback({ success: true });
    });

    // �Ͽ����Ӵ���
    socket.on('disconnect', () => {
        console.log('�û��Ͽ�����:', socket.id);
        // �����з������Ƴ������
        Object.keys(rooms).forEach(roomId => {
            const room = rooms[roomId];
            room.players = room.players.filter(p => p.id !== socket.id);

            // ���������ˣ�ɾ������
            if (room.players.length === 0) {
                delete rooms[roomId];
            } else {
                // ֪ͨʣ����Ҹ����б�
                io.to(roomId).emit('playersUpdated', room.players);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`�����������ڶ˿� ${PORT}`);
});