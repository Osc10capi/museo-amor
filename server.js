const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e7 // Permitir imágenes Base64 de hasta 10MB
});

app.use(express.static(__dirname));

const MEMORIES_FILE = path.join(__dirname, 'memories.json');

// Recuerdos por defecto si el archivo no existe
const defaultMemories = [
    {
        id: 1,
        title: "Nuestra primera foto",
        date: "Temporada Navideña",
        description: "Nuestra primera foto en temporadas navideñas. Un recuerdo muy hermoso y especial.",
        imageUrl: "foto1.jpeg"
    },
    {
        id: 2,
        title: "Nuestra primera salida",
        date: "Una cita inolvidable",
        description: "Un día inolvidable en el que estaba muy nervioso, pero extremadamente feliz de estar a tu lado.",
        imageUrl: "foto2.jpeg"
    }
];

function loadMemories() {
    try {
        if (fs.existsSync(MEMORIES_FILE)) {
            const data = fs.readFileSync(MEMORIES_FILE, 'utf8');
            return JSON.parse(data);
        } else {
            fs.writeFileSync(MEMORIES_FILE, JSON.stringify(defaultMemories, null, 2));
            return defaultMemories;
        }
    } catch (err) {
        console.error('Error leyendo memories.json:', err);
        return defaultMemories;
    }
}

function saveMemories(memories) {
    try {
        fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));
    } catch (err) {
        console.error('Error guardando en memories.json:', err);
    }
}

let memories = loadMemories();
let players = {};

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Enviar recuerdos actuales al conectarse
    socket.emit('updateMemories', memories);

    socket.on('joinGame', (playerData) => {
        players[socket.id] = {
            id: socket.id,
            name: playerData.name,
            role: playerData.role,
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

    socket.on('addMemory', (newMem) => {
        memories.push(newMem);
        saveMemories(memories);
        io.emit('updateMemories', memories);
    });

    socket.on('deleteMemory', (memoryId) => {
        memories = memories.filter(m => m.id !== memoryId);
        saveMemories(memories);
        io.emit('updateMemories', memories);
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
