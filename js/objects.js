// Class Customer. It is called by character object as argument
function Customer (character, index) {
    // Characteristics, same as in character object
    this.speed = character.speed;
    this.maxPrice = character.maxPrice;
    this.lookTime = character.lookTime;
    this.helpTime = character.helpTime;
    this.chatTime = character.chatTime;
    this.fuckOffTime = character.fuckOffTime;
    this.buyExp = character.buyExp;
    this.sprite = character.sprite();

    // Starting position in map coordinates
    this.pos = [startingPosCustomer[index][0], startingPosCustomer[index][1]];
    // Starting position in pixel ("real") coordinates
    this.pixPos = [this.pos[0] * 50, this.pos[1] * 50];
    this.start = this.pos;
    this.arrived = true; // Whether object reached its destination
    this.collided = 0; // Collision counter

    this.vector = []; // Moving direction vector
    this.action = ""; // What action is object currently performing
    this.actionStart = Date.now();
    this.actionStops = Date.now();
    this.fuckOff = false; // Whether object is pissed
    this.target = newTarget (this); // Object's target

    makeDecision(this);
    
    // When object is finnished doing what it's doing this function gives it new task depending on current state
    function makeDecision (obj) {
        
        // If object is not on the counter - walk to new position
        if (getMapValue(obj.pos) == "e" || getMapValue(obj.pos) == "x") {
                newTarget(obj);
        } else {
            // If object (Customer) is on the counter decide what to do next:
            var odluka = Math.floor(Math.random() * 3);
            switch (odluka) {
                    case 0: 
                            newTarget(obj); // move from counter
                            break;
                    case 1:
                            look(obj); // look at counter
                            break;
                    case 2:
                            help(obj); // ask for help
                            break;
                    default:
                            newTarget(obj);
            }
        }
    }
    
    // Sends object for a walk in random direction
    function newTarget (obj) {
        var direction;
        var coord = [];
        var vector = [];
        // Look randomly for unblocked direction
        do {
            direction = Math.floor(Math.random() * 4);
            coord = [obj.pos[0], obj.pos[1]];
            switch (direction) {
                    case 0: 
                            vector = [-1, 0]
                            break;
                    case 1: 
                            vector = [1, 0]
                            break;
                    case 2: 
                            vector = [0, -1]
                            break;
                    case 3: 
                            vector = [0, 1]
                            break;
            }
            coord = [coord[0] + vector[0], coord[1] + vector[1]];
        } while (!checkCoord(coord) || (getMapValue(coord) == "0"));
        
        // Set moving variables
        obj.start = obj.pos;
        obj.target = coord;
        obj.arrived = false;
        obj.action = "moving";
        obj.vector = vector;
        obj.actionStart = Date.now();
        return coord;
    }
    
    // Sets object for looking at the counter
    function look(obj) {
        // Random looking time
        var time = Math.floor(Math.random() * (obj.lookTime / 2))
        time = (isNaN(time)) ? 0 : time;
        time = Math.floor(time + obj.lookTime / 2);
        
        // Set looking variables
        obj.action = "looking";
        obj.actionStart = Date.now();
        obj.actionStops = obj.actionStart + time;
    }

    // Sets object for asking for help
    function help(obj) {
        // Random waiting for help time
        var time = Math.floor(Math.random() * (obj.helpTime / 2))
        time = (isNaN(time)) ? 0 : time;
        time = Math.floor(time + obj.helpTime / 2);
        
        // Set waiting for help variables
        obj.action = "help";
        obj.actionStart = Date.now();
        obj.actionStops = obj.actionStart + time;
        
        // Mark counter hot spot as occupied so that seller can serve it
        objects[parseInt(getMapValue(obj.pos))].occupato = true;
    }
    
    // Sets object for chatting with the seller before deciding to buy
    function chat(obj) {
        // Random chatting time
        var time = Math.floor(Math.random() * (obj.chatTime / 2))
        time = (isNaN(time)) ? 0 : time;
        time = Math.floor(time + obj.chatTime / 2);
        
        // Set chatting variables
        obj.action = "chat";
        obj.actionStart = Date.now();
        obj.actionStops = obj.actionStart + time;
    }
    
    // Sets object for pissed state, if it hasn't been served on time
    function fuckOff(obj) {
        obj.fuckOff = true;
        // Mark counter hot spot as free
        objects[parseInt(getMapValue(obj.pos))].occupato = false;
        // Turn off pissed mode after a while
        window.setTimeout(function() {obj.fuckOff = false;}, obj.fuckOffTime);
        // Send object somewhere
        newTarget(obj);
    }
    
    // Calculates object's position/status in time
    this.move = function(dt) {
        // It dependes on what is object currently doing
        switch (this.action) {
            case "moving":
                // If moving, calculate next position
                this.pixPos[0] += this.vector[0] * dt * this.speed;
                this.pixPos[1] += this.vector[1] * dt * this.speed;
                // If it reached its target, update position variables and decide what to do next
                if (isNear(this.pixPos, [this.target[0] * 50, this.target[1] * 50], 5)) {
                        this.arrived = true;
                        this.pos[0] = this.target[0];
                        this.pos[1] = this.target[1];
                        this.pixPos[0] = this.pos[0] * 50;
                        this.pixPos[1] = this.pos[1] * 50;
                        makeDecision(this);
                }
                break;
            case "looking":
                // If finnished looking, decide what to do next
                var time = Date.now();
                if (time > this.actionStops) {
                        makeDecision(this);
                }
                break;
            case "help":
                var time = Date.now();
                // If waiting for help and being served, start chatting
                if (objects[parseInt(getMapValue(this.pos))].servito) {
                        chat(this);
                        break;
                } else {
                    // Else, if waiting for help time is over, go creazy!
                    if (time > this.actionStops) {
                        fuckOff(this);
                    }
                }
                break;
            case "chat":
                var time = Date.now();
                // If seller leaves you while you are talking with her, go creazy!
                if (!objects[parseInt(getMapValue(this.pos))].servito) {
                        fuckOff(this);
                } else {
                    // Else, if time for decision is here...
                    if (time > this.actionStops) {
                        // Randomly decide whether you're gonna buy something...
                        if (Math.random() < this.buyExp){
                            // And how much money you're gonna spend
                            var money = (Math.floor(Math.random() * (this.maxPrice - 1)) + 1) * 50;
                            money = money || 0;
                            // Give money to seller
                            if (!isGameOver) {player.giveMoney(money);}
                        }
                        // Free up counter hot spot
                        objects[parseInt(getMapValue(this.pos))].servito = false;
                        objects[parseInt(getMapValue(this.pos))].occupato = false;
                        this.action = "";
                        // And go somewhere
                        newTarget(this);
                    }
                }
                break;
        }
    };

    // Change direction in case of collision with other moving objects
    this.collision = function(){
        if (this.action === "moving"){
            this.vector = [this.vector[0] * (-1), this.vector[1] * (-1)];
            var pom = this.target;
            this.target = this.start;
            this.start = pom;
        }
    };
}