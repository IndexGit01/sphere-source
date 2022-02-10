// Dependencies
const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const favicon = require('serve-favicon');
const fs = require('fs');
const webpush = require('web-push');
const swearjar = require('swearjar-extended');
const port = 3000;

swearjar.loadBadWords('./words.json');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

app.set('port', port);
app.use('/static', express.static(__dirname + '/static'));
app.use(favicon(__dirname + '/static/favicon.ico'));


app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, '/index.html'));
});


server.listen(port, function() {
  console.log(`Starting server on port ${port}!`);
});

var players = {};

io.on('connection', function(socket) {
  console.log("new player")
  socket.on('new player', function() {
    players[socket.id] = {
      x: 300,
      y: 300,
      username: 'Connecting...',
      chatmsg: ''
    };
  });
  socket.on('movement', function(data) {
    var player = players[socket.id] || {};
    if (data.left) {
      if (player.x >= 0) {
        player.x -= 5;
      }
    }
    if (data.up) {
      if (player.y >= 0) {
        player.y -= 5;
      }
    }
    if (data.right) {
      if (player.x <= 1140) {
        player.x += 5;
      }
    }
    if (data.down) {
      if (player.y <= 540) {
        player.y += 5;
      }
    }
  })
  socket.on('nameChange', function(data) {
    var player = players[socket.id] || {};
    if (data.replace(' ', '') == "") {
      players[socket.id]['username'] = "player " + Math.floor(Math.random() * 1001);
      return;
    } else {
      for (check in players) {
        var playes = players[check]['username'];
        if (playes == data) {
          players[socket.id]['username'] = swearjar.censor(data).substring(0, 15) + Math.floor(Math.random() * 1001);
          return;
        } else {
          continue;
        }
      }
    };
    players[socket.id]['username'] = swearjar.censor(data).substring(0, 15);
  })
  socket.on("chatMessage", function(data) {
    var player = players[socket.id] || {};
    if (data == "") {
      return;
    } else {
      if (data.trim() == "") {
        return
      } else {
        data = data.substring(0, 250);
      }
      msg = player['username'] + ": " + swearjar.censor(data);
      player['chatmsg'] = swearjar.censor(data);
      io.sockets.emit('newMessage', msg);
    }
  });

  socket.on('disconnect', function() {
    delete players[socket.id];
  });
});

setInterval(function() {
  io.sockets.emit('state', players);
}, 1000 / 60);

setInterval(function() {
  if (Object.keys(players).length == undefined) {
    fs.writeFile('static/players.txt', "0", function(err) {
      if (err) return console.log(err);
    })
  } else {
    fs.writeFile('static/players.txt', Object.keys(players).length.toString(), function(err) {
      if (err) return console.log(err);
    })
  }
}, 1000)
