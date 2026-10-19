const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let players = {};

io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado:', socket.id);

    socket.on('joinGame', (playerData) => {
        players[socket.id] = {
            id: socket.id,
            name: playerData.name,
            role: playerData.role, // 'oscar' o 'evelin'
            x: playerData.role === 'oscar' ? 200 : 300,
            direction: 1,
            isWalking: false
        };
        io.emit('currentPlayers', players);
    });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].direction = movementData.direction;
            players[socket.id].isWalking = movementData.isWalking;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor del museo corriendo en el puerto ${PORT}`);
});