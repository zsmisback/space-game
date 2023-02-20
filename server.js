import Collectible from './public/Collectible';
import {canvasDetails, generateStartPos} from './public/canvasData.mjs';

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);

let players = {};
let spectators = [];
let messages = [];
let idLength = 10;
let newX = generateStartPos(canvasDetails.fieldMinX, canvasDetails.fieldMaxX, 5);
let newY = generateStartPos(canvasDetails.fieldMinY, canvasDetails.fieldMaxY, 5);
let serverCollectible = new Collectible({x: newX, y: newY, id: generateID(idLength)});
let tick;
clearInterval(tick);

function generateID(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

let connectionCount = 0;

io.on("connection", (socket) => {
  connectionCount++;
  console.log("new-player")
  socket.on('pings', function() {
    socket.emit('pong');
  });
  
  socket.emit("init", {players: players, currentCollectible: serverCollectible});

  //New Changes
  socket.on("new-player", ({id, player}) => {
    socket["testID"] = id;
    players[id] = {x: player.x, y: player.y, score: player.score, lastProcessedSequence: 0};
    //Old Change
    //io.emit("new-player", {newPlayerId: id, playerDetails: players[id]});
  });

  socket.on("sendMessage", (entity) => {
    messages.push(entity);
  })

  ////////////
  socket.on("spectator", ({id, player}) => {

    socket["testID"] = id;
    socket["x"] = player.x;
    socket["y"] = player.y;
    socket["score"] = player.score;
    let existingSocket = false;
    for(let i = 0; i < spectators.length;i++){
      if(spectators[i]["testID"] == id){
        existingSocket = true;
        spectators[i] = socket;
      }
    }

    if(!existingSocket){
      let currLength = spectators.push(socket);
      for(let i = 0; i < spectators.length;i++){
        spectators[i].emit("update-queue", {position: i+1 , totalQueue: currLength});
      }
    }

  })

  socket.on("movePlayer", ({id, x, y, dir}) => {
    if(players[id]){
      players[id]["x"] = x;
      players[id]["y"] = y;
      io.emit("movePlayer", {id: id, x: x, y: y, dir: dir});
    }
  });

  socket.on("stopPlayer", ({id, x, y, dir}) => {
    if(players[id]){
      players[id]["x"] = x;
      players[id]["y"] = y;
      io.emit("stopPlayer", {id: id, x: x, y: y, dir: dir});
    }
  });
  
  socket.on("destroyed-item", ({playerId, id}) => {
    if(serverCollectible.id == id){
      console.log("destroy req received");
      let newX = generateStartPos(canvasDetails.fieldMinX, canvasDetails.fieldMaxX, 2);
      let newY = generateStartPos(canvasDetails.fieldMinY, canvasDetails.fieldMaxY, 2);
      let newId = generateID(idLength);
      serverCollectible = new Collectible({x:newX, y:newY, id:newId});
      players[playerId]["score"] += 1;
      let currentPlayerScore = players[playerId]["score"];
      io.emit("update-score", {id: playerId, score:currentPlayerScore});
      if(currentPlayerScore == 25){
        players = {};
        spectators = [];
        io.emit("end-game", {winningPlayerId: playerId});
      }else{
        io.emit("new-item", serverCollectible);
      }
    }
  })

  socket.on("disconnect", () => {
    connectionCount--;
    console.log("player disconnected")
    if(players[socket["testID"]]){
      delete players[socket["testID"]];
      io.emit("disconnectedUser", {id: socket["testID"]});
    }else{
      spectators = spectators.filter(socketObj => socketObj["testID"] != socket["testID"]);
    }
    
    if(Object.keys(players).length < 4 && spectators.length > 0){
      let socketObj = spectators.shift();
      players[socketObj["testID"]] = {x: socketObj.x, y: socketObj.y, score: socketObj.score};
      io.emit("new-player", {newPlayerId: socketObj["testID"], playerDetails: players[socketObj["testID"]]});
      let currLength = spectators.length;
      for(let i = 0; i < spectators.length;i++){
        spectators[i].emit("update-queue", {position: i+1 , totalQueue: currLength});
      }
    }

    console.log(players);
  })
})

function updatePlayers(){
    processMessages();
    io.emit("updatePlayers", players);
}

function processMessages(){
  //entity = {id: [user.id], dir: dir, inputSequenceNumber: [number]}
  while(messages.length != 0){
    let entity = messages.shift();
    let id = entity.id;
    let keys = entity.keys;
    let deltaTime= entity.deltaTime;
    let expectedSpeed = canvasDetails.canvasSpeed * deltaTime;
    if (keys["ArrowUp"]|| keys["w"])
      players[id]["y"] - expectedSpeed <= canvasDetails.fieldMinY ? players[id]["y"] -= 0 : players[id]["y"] -= expectedSpeed;
    if (keys["ArrowDown"] || keys["s"])
      players[id]["y"] + expectedSpeed >= canvasDetails.fieldMaxY ? players[id]["y"] += 0 : players[id]["y"] += expectedSpeed;
    if (keys["ArrowLeft"] || keys["a"])
      players[id]["x"] - expectedSpeed <= canvasDetails.fieldMinX ? players[id]["x"] -= 0 : players[id]["x"] -= expectedSpeed;
    if (keys["ArrowRight"] || keys["d"])
      players[id]["x"] + expectedSpeed >= canvasDetails.fieldMaxX ? players[id]["x"] += 0 : players[id]["x"] += expectedSpeed;

    players[id]["lastProcessedSequence"] = entity.inputSequence;
  }
}

tick = setInterval(updatePlayers, 1000/10);

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//For FCC testing purposes and enables user to connect from outside the hosting platform
app.use(cors({origin: '*'})); 

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    if(connectionCount >= 4){
      res.send("<p>The server is currently full. Please try again later.</p>");
    }else{
      res.sendFile(process.cwd() + '/views/index.html');
    }
  }); 

// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 80;

// Set up server and tests
const server = httpServer.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
});

