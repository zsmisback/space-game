import Player from './Player.mjs';
import Collectible from './Collectible.mjs';
import { canvasDetails, generateStartPos } from './canvasData.mjs';

// Preload game assets
const loadImage = src => {
    const img = new Image();
    img.src = src;
    return img;
  }

function generateUserID() {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  var length = 15;
  for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const fieldImage = loadImage("./public/resources/space.jpg");
const ball = loadImage("./public/resources/gold-coin.png");
const mainPlayerUfo = loadImage("./public/resources/mainPlayer.png");
const otherPlayerUfo = loadImage("./public/resources/otherPlayer.png");
const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');
const titleField = document.getElementById('title-field');

if(sessionStorage.getItem("userID") == null){
  sessionStorage.setItem("userID", generateUserID());
}

let tick;
let localPlayersArr = [];
let collectible;
let endGame = false;
let isSpectator = false;
//New Changes
let messages = [];
//////////////////////
let startTime;
let queue = [0, 0];
let mainPlayer;
let singlePlayerContent = '<p>Be the first alien to score 25 points</p><p style="font-size:10px;">You seem to be the only player. Open the game/url in another tab in order to test the multi-player aspect.</p>';
let playerChallengeContent = '<p>Be the first alien to score 25 points</p>';
let pingDiv = document.getElementById('ping_div');

function reloadPage(){
  location.reload();
}
setInterval(function() {
  startTime = Date.now();
  socket.emit('pings');
}, 1000);

socket.on('pong', function() {
  let latency = Date.now() - startTime;
  pingDiv.innerHTML = '<p>Ping: '+latency+' ms</p><p style="font-size:10px;">(The higher the <b>ping</b>, the slower the response)</p>';
});

socket.on("init", ({players, currentCollectible})=>{
    cancelAnimationFrame(tick);
    localPlayersArr = [];
    let playerCount = Object.keys(players).length;

    let mainPlayerId = sessionStorage.getItem("userID");

    let playerInfo = {
        id: mainPlayerId, 
        x: generateStartPos(canvasDetails.fieldMinX, canvasDetails.fieldMaxX, 5), 
        y: generateStartPos(canvasDetails.fieldMinY, canvasDetails.fieldMaxY, 5), 
        score: 0,
        isMain: true
    };

    mainPlayer = new Player(playerInfo);
    
    if(playerCount >= 4){
      isSpectator = true;
      socket.emit("spectator", {id: mainPlayerId, player: mainPlayer})
    }else{
      socket.emit("new-player", {id: mainPlayerId, player: mainPlayer});
    }

    socket.on("update-queue", ({position, totalQueue}) => {
      queue[0] = position;
      queue[1] = totalQueue;
    })

    socket.on("new-player", ({newPlayerId, playerDetails}) => {
        let x = playerDetails["x"];
        let y = playerDetails["y"];
        let score = playerDetails["score"];
        const playerId = localPlayersArr.map(playerObj => playerObj.id);
        if(!playerId.includes(newPlayerId)){
          if(newPlayerId == mainPlayerId){
            isSpectator = false;
            titleField.innerHTML = playerChallengeContent;
            localPlayersArr.push(mainPlayer);
          }else{
            localPlayersArr.push(new Player({id: newPlayerId, x: x, y: y, score: score}));
          }
        }

        if(localPlayersArr.length <= 1){
          titleField.innerHTML = singlePlayerContent;
        }else{
          titleField.innerHTML = playerChallengeContent;
        }
    });

    socket.on("movePlayer", ({id, x, y, dir}) => {
        if(id != mainPlayerId){
            const movingPlayerObj = localPlayersArr.find(playerObj => playerObj.id == id);
            movingPlayerObj.movDirection(dir);


            movingPlayerObj.x = x;
            movingPlayerObj.y = y;
        }
    })

    socket.on("new-item", (newCollectible) => {
        collectible = new Collectible(newCollectible);
    })

    //New Changes
    socket.on("updatePlayers", (players) => {
      const playerIds = localPlayersArr.map(player => player.id);
      for(let key in players){
        let messagePlayerInfo = {
          id: key, 
          x: players[key]["x"], 
          y: players[key]["y"], 
          score: players[key]["score"]
        };

        if(!playerIds.includes(key)){
          console.log("pushed new player");
          localPlayersArr.push(new Player(messagePlayerInfo));
        }

        messagePlayerInfo["lastProcessedSequence"] = players[key]["lastProcessedSequence"];
        messages.push(messagePlayerInfo);
      }
      
      //console.log(messages);
    })
    ///////////////////////////////

    socket.on("stopPlayer", ({id, x, y, dir}) => {

        if(id != mainPlayerId){
            const movingPlayerObj = localPlayersArr.find(playerObj => playerObj.id === id);
            movingPlayerObj.stopDirection(dir);

          
            movingPlayerObj.x = x;
            movingPlayerObj.y = y;
        }
    })

    socket.on("update-score", ({id, score}) => {
        const playerObj = localPlayersArr.find(obj => obj.id === id);
        playerObj.score = score;
    })

    socket.on("end-game", ({winningPlayerId}) => {
      endGame = true;
      
      document.getElementsByTagName("BODY")[0].style.background = "rgba(0, 0, 0, 0.5)";
      let gameDiv = document.getElementById("game_end_div");
      gameDiv.style.display = "block";
      let gameEndingText = "Game Over<br>";
      if(!isSpectator){
        let mainPlayerInfo = localPlayersArr.find(obj => obj.id == mainPlayerId);
        let rankArray = mainPlayerInfo.calculateRank(localPlayersArr).split(" ");
        if(mainPlayerInfo.id == winningPlayerId){
          gameEndingText += "<br>You Won!<br>";
        }else{
          gameEndingText += "<br>You Lost.<br>";
        }
        gameEndingText += `<br>You ranked ${rankArray[1]}/${rankArray[3]} with a score of ${mainPlayerInfo.score}`;
      }
      gameEndingText += "<br>The game will restart in 5 seconds";
      gameDiv.innerHTML = gameEndingText;
      socket.disconnect();
      setTimeout(reloadPage, 5000);
    })
  
    socket.on("disconnectedUser", ({id}) => {
        localPlayersArr = localPlayersArr.filter(obj => obj.id !== id);
        if(localPlayersArr.length <= 1){
          titleField.innerHTML = singlePlayerContent;
        }
    })

    
    if(isSpectator){
      titleField.innerHTML = '<p>Max Amount of players reached. Please wait.</p>';
    }else{
      titleField.innerHTML = playerChallengeContent;
    }

    for(let key in players){
      if(players[key] != mainPlayerId){
        let currPlayerInfo = {};
        currPlayerInfo["id"] = key;
        currPlayerInfo["x"] = players[key]["x"];
        currPlayerInfo["y"] = players[key]["y"];
        currPlayerInfo["score"] = players[key]["score"];
        localPlayersArr.push(new Player(currPlayerInfo));
      }
    }

    const playerIds = localPlayersArr.map(playerObj => playerObj.id);
    if(!playerIds.includes(mainPlayerId) && !isSpectator) localPlayersArr.push(mainPlayer);
    collectible = new Collectible(currentCollectible);
    let fps = 0;
    setInterval(function(){
      document.getElementById("fps").innerHTML = fps;
      fps = 0;
    }, 1000);
    function updateGame(){
        fps++;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(fieldImage, canvasDetails.fieldMinX, canvasDetails.fieldMinY, canvasDetails.fieldWidth, canvasDetails.fieldHeight)
        context.strokeStyle = 'black';
        context.strokeRect(canvasDetails.fieldMinX, canvasDetails.fieldMinY, canvasDetails.fieldWidth, canvasDetails.fieldHeight);
        if(isSpectator){
          context.fillStyle = 'black';
          context.font = `13px 'Press Start 2P'`;
          context.textAlign = 'center';
          context.fillText(`Queue: ${queue[0]}/${queue[1]}`, 100, 32.5);
        }else{
          // Controls text
          context.fillStyle = 'black';
          context.font = `13px 'Press Start 2P'`;
          context.textAlign = 'center';
          context.fillText('Controls:WASD', 100, 32.5);

          // Score
          context.font = `16px 'Press Start 2P'`;
          context.fillText('Score:'+ mainPlayer.score, canvasDetails.canvasWidth / 2, 32.5);
        }
      if(!endGame){
        //New Changes
        
        while(messages.length > 0){
          let message = messages.shift();
          //console.log(message);
          if(message.id == mainPlayerId){
            
            mainPlayer.x = message.x;
            mainPlayer.y = message.y;
            
            let j = 0;
            while(j < mainPlayer.inputs.length){
              let input = mainPlayer.inputs[j];
              if(input.inputSequence <= message.lastProcessedSequence){
                mainPlayer.inputs.splice(j, 1);
              }else{
                let keys = input.keys;
                mainPlayer.speedX = 0;
                mainPlayer.speedY = 0;
                let calculatedSpeed = canvasDetails.canvasSpeed * input.deltaTime;
                if(keys["ArrowUp"] || keys["w"]) mainPlayer.y - calculatedSpeed <= canvasDetails.fieldMinY ? mainPlayer.speedY = 0 : mainPlayer.speedY -= calculatedSpeed;
                if(keys["ArrowDown"] || keys["s"]) mainPlayer.y + calculatedSpeed >= canvasDetails.fieldMaxY ? mainPlayer.speedY = 0 : mainPlayer.speedY += calculatedSpeed;
                if(keys["ArrowLeft"] || keys["a"]) mainPlayer.x - calculatedSpeed <= canvasDetails.fieldMinX ? mainPlayer.speedX = 0 : mainPlayer.speedX -= calculatedSpeed;
                if(keys["ArrowRight"] || keys["d"]) mainPlayer.x + calculatedSpeed >= canvasDetails.fieldMaxX ? mainPlayer.speedX = 0 : mainPlayer.speedX += calculatedSpeed;
                mainPlayer.applyInputDirection();
                console.log("here - input number - "+input.inputSequence+" - lastProcessed - "+message.lastProcessedSequence);
                j++;
              }
            }
          }else{
            let otherPlayer = localPlayersArr.find(player => player.id == message.id);
            let timestamp = +new Date();
            otherPlayer.positionBuffer.push([message.x, message.y, timestamp]);
          }
        }
        
        let render_timestamp = +new Date() - (1000/10);
        localPlayersArr.forEach(playerObj => {
          //New Changes - added socket object
            playerObj.drawPlayer(context, collectible, localPlayersArr, {mainPlayerUfo, otherPlayerUfo}, socket, render_timestamp);
        })

        collectible.draw(context, ball);
        if(collectible.destroyedBy){
            socket.emit("destroyed-item", {playerId:collectible.destroyedBy, id: collectible.id});
        }
      }
        tick = requestAnimationFrame(updateGame);
    }
    
    updateGame();

    window.addEventListener("keydown", function(e){
      if(!isSpectator){
        if(!mainPlayer.keys[e.key]){
            mainPlayer.movDirection(e.key);
            /* Old Code
          if(!endGame){
            socket.emit("movePlayer", {id: mainPlayer.id, x: mainPlayer.x, y: mainPlayer.y, dir: e.key})
          }
          */
        }
      }
    })
    
    window.addEventListener("keyup", function(e){
      if(!isSpectator){
        if(mainPlayer.keys[e.key]){
            mainPlayer.stopDirection(e.key);
            /* Old Code
          if(!endGame){
            socket.emit("stopPlayer", {id: mainPlayer.id, x: mainPlayer.x, y: mainPlayer.y, dir: e.key})
          }
          */
        }
      }
    })

})