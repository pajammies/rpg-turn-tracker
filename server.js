const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});



app.use(express.static(__dirname));

app.use("/js", express.static('./js/'));
app.use("/node_modules", express.static('./node_modules/'));
app.use("/styles", express.static('./styles/'));

io.on('connection', (socket) => {

    let currentRoom = '';

    socket.on('join', function(room) {

        socket.join(room);

        socket.to(room).emit('new-user');

        console.log('User joined ' + currentRoom);
    });

    console.log('a user connected');

    socket.on('look-for-room', (room) => {
        let allRooms = Array.from(io.of("/").adapter.rooms);
        let foundRoom = false;
        let currentRoom = Array.from(socket.rooms);

        for (let i = 0; i < allRooms.length; i++) {
            if (!foundRoom) {
                if (room == allRooms[i][0]) {
                    socket.join(room);
                    socket.to(room).emit('new-user');
                    console.log('User joined ' + room);
                    foundRoom = true;
                    socket.leave(currentRoom[0])
                    socket.emit('found-room');
                }
            }
        }

        if (!foundRoom) {
            socket.emit('room-not-found');
        }
    });

    //if (currentRoom != '') {
    socket.on('items-changed', (data) => {
        let keys = Array.from(socket.rooms);

        for (let i = 0; i < keys.length; i++) {
            console.log(keys[i]);
            socket.to(keys[i]).emit('items-changed', (data));
        }

    });

    socket.on('timer-initialize', () => {
        let keys = Array.from(socket.rooms);

        for (let i = 0; i < keys.length; i++) {
            console.log(keys[i]);
            socket.to(keys[i]).emit('timer-initialize');
        }

    })

    socket.on('modalShowHide', () => {
        let keys = Array.from(socket.rooms);

        for (let i = 0; i < keys.length; i++) {
            //console.log(keys[i]);
            socket.to(keys[i]).emit('modalShowHide');
        }

    });

    socket.on('stop-timer', () => {
        let keys = Array.from(socket.rooms);

        for (let i = 0; i < keys.length; i++) {
            //console.log(keys[i]);
            socket.to(keys[i]).emit('stop-timer');
        }

    });
    //}

    socket.broadcast.emit('new-user');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    /*
    socket.broadcast.emit('new-user');

    socket.on('items-changed', (data) => {
        socket.broadcast.emit('items-changed', (data));
    });

    socket.on('timer-initialize', () => {
        socket.broadcast.emit('timer-initialize');
    })

    socket.on('modalShowHide', () => {
        socket.broadcast.emit('modalShowHide');
    });

    socket.on('stop-timer', () => {
        socket.broadcast.emit('stop-timer');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

     */
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});