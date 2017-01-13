var requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(callback){
                window.setTimeout(callback, 1000 / 60);
            };
})();

// Create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = 600;
canvas.height = 350;
document.getElementById('cs-game-playground').appendChild(canvas);

// Sound effects
var soundTheme = new Audio("sfx/benny-hill-theme.mp3");
var sfxCashRegister = new Audio("sfx/cash-register.mp3");
var sfxCoinDrop = new Audio("sfx/coin-drop.mp3");
soundTheme.loop = true;

var playMusic = true;

// Gameplay variables
var score = 0;
var titles = [];
var isGameOver = true;
var gameTime = 0;
var lastTime;

// Game parameters
var gameDuration = 180; // in seconds
var playerSpeed = 150; // px per sec

// Two tables inside counter
var boxes = [];
boxes[0] = {
	pos: [250, 0],
	size: [100, 50]
};
boxes[1] = {
	pos: [250, 100],
	size: [100, 50]
};

// Game hot spots
var objects = [];

// Register object
objects[1] = {
	type: "reg"
};

// Hot spots on counter - where costumers approach seller
for (var i = 2; i <= 7; i++) {
    objects[i] = {
        type: "count",
        occupato: false, // if counter is occupied with customer
        servito: false // if counter is served by seller
    };	
};

// Map of playground, defines hot spots access points, walls, free areas and starting positons of customers
var playgroundScheme = [
    "00000100000000",
    "ex2020100707xe",
    "0xx00000000xx0",
    "ex3034005606xe",
    "0xx00000000xx0",
    "0xxxx4xx5xxxx0",
    "0xxxxxxxxxxxx0",
    "00000e00e00000"
];

// Couple of helping functions

// Given coordinates, returns character on map
function getMapValue (coord) {
    var j = coord[0] + 1;
    var i = coord[1];
    return playgroundScheme[i].charAt(j);
}

// Given pixel coordinates, returns map coordinates
function getMapPosition (coord) {
    var mapX = Math.floor((coord[0] + 25) / 50);
    var mapY = Math.floor((coord[1] + 25) / 50);
    return [mapX, mapY];
}

// Checking map bounds
function checkCoord (coord) {
    return !((coord[0] < -1) ||
            (coord[0] > 12) ||
            (coord[1] < 0) ||
            (coord[1] > 7));
}

// Checks if first coordinate is "near" second coordinate for given tolerance
function isNear(coord1, coord2, tolerance) {
    return (Math.abs(coord1[0] - coord2[0]) <= tolerance) && 
            (Math.abs(coord1[1] - coord2[1]) <= tolerance);
}

// Coordinates for starting positions of customers
var startingPosCustomer = [];
for (var i = -1; i < 13; i++) {
    for (var j = 0; j < 8; j++) {
        if (getMapValue ([i, j]) === "e") {
            startingPosCustomer.push([i,j]);
        }
    }
}

// Player object
var player = {
    speed: playerSpeed, // pixels per second
    money: 0, // current transaction
    totalMoney: 0, // money in register
    size: [30, 30],
    pixPos: [175, 50], // player position
    sprite: new Sprite('img/sprites.png', [0, 0], [50, 50], 4, [0, 1]), // player's sprite
    // give money to player
    giveMoney: function (money) {
                    this.money = money;
                    sfxCoinDrop.play();
                }
};
var playerName = "";

var players = [];

var lastCollision = [[]];

// Buyers characters
var arab = {
    speed : 70, // px per sec
    maxPrice : 20, // max money character would spend (x50)
    lookTime : 5000, // max time for looking at counter
    helpTime : 3000, // max time waiting for help
    chatTime : 4000, // max time chating with seller befor deciding to buy
    fuckOffTime : 1000, // how long character is pissed for not being served
    buyExp : .50, // probability of buying something
    sprite: function(){return new Sprite('img/sprites.png', [0, 225], [50, 50], 4, [0, 1]);} // character's sprite
};

var engl = {
    speed : 70,
    maxPrice : 8,
    lookTime : 4000,
    helpTime : 3000,
    chatTime : 2000,
    fuckOffTime : 1000,
    buyExp : .75,
    sprite: function(){return new Sprite('img/sprites.png', [0, 100], [50, 50], 4, [0, 1]);}
};

var chin = {
    speed : 70,
    maxPrice : 5,
    lookTime : 3000,
    helpTime : 5000,
    chatTime : 4000,
    fuckOffTime : 1000,
    buyExp : .90,
    sprite: function(){return new Sprite('img/sprites.png', [0, 175], [50, 50], 4, [0, 1]);}
};

// HTML user interface
var playerNameEl = document.getElementById('cs-player-name');

var scoreEl = document.getElementById('cs-score');

var timeEl = document.getElementById('cs-time');

var highScore = parseInt(localStorage.getItem('highScore')) || 0;
var highScoreEl = document.getElementById('cs-high-score');
highScoreEl.innerHTML = highScore;

var highScorePlayerName = localStorage.getItem('highScorePlayerName') || "";
var highScorePlayerNameEl = document.getElementById('cs-high-score-player-name');
highScorePlayerNameEl.innerHTML = highScorePlayerName;

var gameStartEl = document.getElementById('cs-game-start-wrapper');
gameStartEl.style.display = "table-cell";

var gameOverEl = document.getElementById('cs-game-over-wrapper');
gameOverEl.style.display = "none";

// Click handlers
document.getElementById("cs-submit-player-name-btn").addEventListener("click", function() {
    if (document.getElementById("cs-player-name-input").value !== "") {
        playerName = document.getElementById("cs-player-name-input").value;
        playerNameEl.innerHTML = playerName;
        gameStartEl.style.display = "none";
        resetGame();
        isGameOver = false;
    }
});

document.getElementById("cs-play-again-btn").addEventListener("click", function() {
    gameOverEl.style.display = "none";
    gameStartEl.style.display = "table-cell";
});

var toogleSoundEl = document.getElementById("cs-sound");
toogleSoundEl.addEventListener("click", function() {
    playMusic = !playMusic;
    if (playMusic) {
        soundTheme.play();
        toogleSoundEl.style.backgroundImage = "url('img/sound-on.png')";
    } else {
        soundTheme.pause();
        toogleSoundEl.style.backgroundImage = "url('img/sound-off.png')";
    }
});

resources.load([
    'img/sprites.png',
    'img/background.png'
]);

resources.onReady(init);

// Start animation
function init() {
    terrainPattern = ctx.createPattern(resources.get('img/background.png'), 'repeat');
    resetGame();
    main();
}

// Reset game variables
function resetGame() {
    for (var i=2; i<=7; i++) {
        objects[i].occupato = false;
        objects[i].servito = false;
    }

    titles = [];

    player.money = 0;
    player.totalMoney = 0;

    players = [];
    players[0] = new Customer(engl, 0);
    players[1] = new Customer(chin, 1);
    players[2] = new Customer(engl, 2);
    players[3] = new Customer(chin, 3);
    players[4] = new Customer(arab, 4);
    players[5] = new Customer(chin, 5);
    
    lastCollision = [[]];
    for (var i = 0; i < 6; i++) {
        lastCollision[i] = [];
        for (var j = 0; j < 6; j++) {
            lastCollision[i][j] = Date.now();
        }
    }

    gameTime = 0;
    soundTheme.pause();
    soundTheme.currentTime = 0;
    if (playMusic) {
        soundTheme.play();
    }
    lastTime = Date.now();
};

// The main game loop
function main() {
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0;

    update(dt);
    render();

    lastTime = now;
    requestAnimFrame(main);
};


// Game state
function update(dt) {
    
    if (!isGameOver) {
        gameTime += dt;
        handleInput(dt);
        if (gameTime > gameDuration) {
            gameOver();
        }
    }

    updateEntities(dt);

    checkCollisions();
    
    updateHTMLElements();
};

// Game over
function gameOver() {
    isGameOver = true;
    
    gameOverEl.style.display = "table-cell";
    document.getElementById('cs-game-over-score-points').innerHTML = player.totalMoney;
    
    // Check for high score
    if (player.totalMoney > highScore || isNaN(highScore)) {
        localStorage.setItem('highScore', '' + player.totalMoney);
        highScore = player.totalMoney;
        highScoreEl.innerHTML = highScore;
        localStorage.setItem('highScorePlayerName', playerName);
        highScorePlayerNameEl.innerHTML = playerName;
        document.getElementById('cs-game-over-high-score').style.display = 'block';
    } else {
        document.getElementById('cs-game-over-high-score').style.display = 'none';
    }
}

function handleInput(dt) {
    var temp = [];
    var temp2 = [];
    if(input.isDown('DOWN') || input.isDown('s')) {
        temp = [player.pixPos[0], player.pixPos[1] + player.speed * dt];
        temp2 = [temp[0] + 10, temp[1] + 10];
        if (!(boxCollides(temp2, player.size, boxes[0].pos, boxes[0].size) ||
            boxCollides(temp2, player.size, boxes[1].pos, boxes[1].size))){
            player.pixPos[1] = temp[1];
        }
    }

    if(input.isDown('UP') || input.isDown('w')) {
        temp = [player.pixPos[0], player.pixPos[1] - player.speed * dt];
        temp2 = [temp[0] + 10, temp[1] + 10];
        if (!(boxCollides(temp2, player.size, boxes[0].pos, boxes[0].size) ||
            boxCollides(temp2, player.size, boxes[1].pos, boxes[1].size))){
            player.pixPos[1] = temp[1];
        }
    }

    if(input.isDown('LEFT') || input.isDown('a')) {
        temp = [player.pixPos[0] - player.speed * dt, player.pixPos[1]];
        temp2 = [temp[0] + 10, temp[1] + 10];
        if (!(boxCollides(temp2, player.size, boxes[0].pos, boxes[0].size) ||
            boxCollides(temp2, player.size, boxes[1].pos, boxes[1].size))){
            player.pixPos[0] = temp[0];
        }
    }

    if(input.isDown('RIGHT') || input.isDown('d')) {
        temp = [player.pixPos[0] + player.speed * dt, player.pixPos[1]];
        temp2 = [temp[0] + 10, temp[1] + 10];
        if (!(boxCollides(temp2, player.size, boxes[0].pos, boxes[0].size) ||
            boxCollides(temp2, player.size, boxes[1].pos, boxes[1].size))){
            player.pixPos[0] = temp[0];
        }
    }

    if(input.isDown('SPACE')) {
        var playerMapPos = getMapPosition(player.pixPos);
        var counterNum = parseInt(getMapValue(playerMapPos));

        if (isNear(player.pixPos, [playerMapPos[0] * 50, playerMapPos[1] * 50], 10)) {
            if (counterNum >= 2 && counterNum <= 7 && objects[counterNum].occupato && player.money === 0) {
                objects[counterNum].servito = true;
            } else {
                if (counterNum === 1 && player.money > 0) {
                    sfxCashRegister.play();
                    player.totalMoney += player.money;
                    player.money = 0;
                } 
            }
        }
    }
    
    var counterNum = parseInt(getMapValue(getMapPosition(player.pixPos)));
    for (var i=2; i<=7; i++) {
        if (objects[i].servito && counterNum !== i) {
            objects[i].servito = false;
        }
    }
}

function updateEntities(dt) {
    // Update the player sprite animation
    player.sprite.update(dt);
    
    // Update customers and text titles
    titles = [];
    for (var i = 0; i < players.length; i++) {
        players[i].move(dt);
        players[i].sprite.update(dt);
        if (players[i].action === "help") {
            titles.push({
                    pixPos: players[i].pixPos,
                    sprite: new Sprite('img/sprites.png', [0, 75], [50, 25])
            })
        } else {
            if (players[i].action === "chat") {
                titles.push({
                    pixPos: players[i].pixPos,
                    sprite: new Sprite('img/sprites.png', [0, 150], [50, 25])
                });
            } else {
                if (players[i].fuckOff) {
                    titles.push({
                        pixPos: players[i].pixPos,
                        sprite: new Sprite('img/sprites.png', [0, 50], [50, 25])
                    });
                }			
            }
        }
        if (player.money !== 0) {
            titles.push({
                pixPos: player.pixPos,
                sprite: new Sprite('img/sprites.png', [0, 275], [50, 25])
            });
        }
    }
}

// Collisions
function collides(x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 ||
             b <= y2 || y > b2);
}

function boxCollides(pos, size, pos2, size2) {
	//document.getElementById("instructions").innerHTML = "tu sam";
	
    return collides(pos[0], pos[1],
                    pos[0] + size[0], pos[1] + size[1],
                    pos2[0], pos2[1],
                    pos2[0] + size2[0], pos2[1] + size2[1]);
}

function handleCollision(i,j) {
    var time = Date.now();
    if (time - lastCollision[i][j] > 100) {
        players[i].collision();
        players[j].collision();
        lastCollision[i][j] = time;
    }
}

function checkCollisions() {
    checkPlayerBounds();

    for(var i=0; i<players.length-1; i++){
        var pos = [players[i].pixPos[0] + 5, players[i].pixPos[1] + 5];
        var size = [players[i].sprite.size[0] - 10, players[i].sprite.size[1] - 10];
        for(var j=i+1; j<players.length; j++){
            var pos2 = [players[j].pixPos[0] + 5, players[j].pixPos[1] + 5];
            var size2 = [players[j].sprite.size[0] - 10, players[j].sprite.size[1] - 10];
            if(boxCollides(pos, size, pos2, size2)) {
                handleCollision(i,j);
            }	    	
        }
    }
}

function checkPlayerBounds() {
    // Check bounds
    if(player.pixPos[0] < 150) {
        player.pixPos[0] = 150;
    }
    else if(player.pixPos[0] > 400) {
        player.pixPos[0] = 400;
    }

    if(player.pixPos[1] < 0) {
        player.pixPos[1] = 0;
    }
    else if(player.pixPos[1] > 150) {
        player.pixPos[1] = 150;
    }
}

// Just for padding zeros in time display
function pad(n, width) {
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join("0") + n;
}

function updateHTMLElements() {
    scoreEl.innerHTML = player.totalMoney;
    timeEl.innerHTML = parseInt((gameDuration - gameTime) / 60) + ":" + pad(parseInt((gameDuration - gameTime) % 60), 2);
}

// Draw everything
function render() {
    ctx.fillStyle = terrainPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    renderEntity(player);
    renderEntities(players);
    renderEntities(titles);

    // Render money
    if (player.money !== 0) {
        ctx.font="bold 11px Arial";
        ctx.fillStyle = "#006600";
        ctx.textAlign = "center";
        ctx.fillText("£" + player.money, player.pixPos[0] + 25, player.pixPos[1] + 12);
    }
};

function renderEntities(list) {
    for(var i=0; i<list.length; i++) {
        renderEntity(list[i]);
    }    
}

function renderEntity(entity) {
    ctx.save();
    ctx.translate(entity.pixPos[0], entity.pixPos[1]);
    entity.sprite.render(ctx);
    ctx.restore();
}