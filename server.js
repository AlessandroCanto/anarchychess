var app = require('http').createServer(handler),
	//handler is a callback function whenever the client connects to the server
	//listen to websocket connections
    io = require('socket.io')(app),
	//file module system for static files (HTML, CSS, JS, SVG and PNGs)
    fs = require("fs") ,
    url = require("url"),
    port = 5000,
	//
    queue = {
        'W': [],
        'B': [],
        'U': [] //undefined (player does not care which color)
    }
app.listen(port);
//listen to 
console.log("HTTP server listening on port " + port);
//reads the request and determiens what to do with it
//
function handler(req, resp){
	var r_url = url.parse(req.url);
    if(r_url.pathname.substring(1) === "getport"){
		/*debugging section to see if port is being intitialized
		passing it as text type if accesssing the route 
		*/
        resp.writeHead(200, {"Content-Type" : "text/plain"});
        resp.write("" + port);
        resp.end();
    }
    else if(r_url.pathname === "/") {
		/*
		root path route and passing the main.html file
		main.html already has the routes to other static files so there is no need 
		*/
        resp.writeHead(200, {"Content-Type" : "text/html"});
        var redirectFile = fs.readFileSync("main.html");
        resp.write(redirectFile);
        resp.end();
    }
	/*
	passes main.html file with readFileSync 
	*/
    else if(r_url.pathname === "/chess") {
        resp.writeHead(200, {"Content-Type" : "text/html"});
        var clientui = fs.readFileSync("chess.html");
        resp.write(clientui);
        resp.end();
    }
	
	else{
		//handles the static files
		var filename = r_url.pathname.substring(1),
		type;

		switch(filename.substring(filename.lastIndexOf(".") + 1)){
			case "html":
			case "htm":
			type = "text/html; charset=UTF-8";
			break;
			case "js":
			type = "application/javascript; charset=UTF-8";
			break;
			case "css":
			type = "text/css; charset=UTF-8";
			break;
			case "svg":
			type = "image/svg+xml";
			break;
			case "png":
			type= "image/png";
			break;
			default:
			type = "application/octet-stream";
			break;
		}
		//defines the read
		fs.readFile(filename, function(err, content){
			if(err){
				resp.writeHead(404, {
					"Content-Type" : "text/plain; charset=UTF-8"
				});
				resp.write(err.message);
				resp.end();
			}
			else{
				resp.writeHead(200, {
					"Content-Type" : type
				});
				resp.write(content);
				resp.end();
			}
		});
	}
}


/* websocket server 
   all sent with JSON encoding
   */
/**
//only declaraiton 
@class GameList singleton which defines the gamelist linked list
**/
var GameList = (function(){
	
	/**
	@class Node defines a linked list node
	@param obj the object the node contains
	@param next the next node
	**/
	//class definition 
	var Node = function(obj, next){
		this.obj = obj;
		this.next = next;
	};
	var that = {},
		rear = null,//a pointer to the last node
		size = 0,
		unique = 0; //functions as game id

	/**
	Adds a game to the game list circular linked list
	@method addGame
	@param {Object} white the white player's socket
	@param {Object} black the black player's socket
	**/
	that.addGame = function(white, black){
		if(rear == null){
			rear = new Node(new Game(white, black, unique), null);
			rear.next = rear;
		}
		else{
			var newNode = new Node(new Game(white, black, unique), rear.next);
			rear.next = newNode;
			rear = newNode;
		}
		size++;
		unique++;
		that.showGames();
		white.emit('matchfound', { color: 'W' });
		black.emit('matchfound', { color: 'B' });
		
	}
	//game ID
	that.removeGame = function(gid){
		console.log("Removing game" + gid);
		if(rear == null){
			//checking if there are any active games
			console.log("Problem -- removing game from null list");
			return;	
		}
		//linear system - sequential search
		var ptr = rear.next, prev = rear;
		//ptr traverse through the linked list (head of the list)
		if(ptr == null) return;
			//if the list is null, nothign will be done
		//will execute at least once
		do{
			if(ptr.obj.gid == gid){
				//remove this guy
				console.log("Removing game " + gid);
				if(ptr.next == ptr){
					//linked list of one node
					//emptying the list
					rear = null;
				}
				else{
					//if there is more than one node
					prev.next = ptr.next;
					ptr.next = null;
					if(ptr == rear){
						rear = prev;
					}
				}
				//decrease the game size
				size--;
				//for debugging purposes and showing the amount of active games
				that.showGames();
				
				//end this iteration
				return;
			}
			//in order to iterate through the list
			prev = ptr;
			ptr = ptr.next;
		}while(ptr != rear.next);
	};
/* for debugging */
	that.showGames = function(){
		if(rear == null){
			console.log("List empty");
			return;
		}
		var ptr = rear.next;
		var str = "Game List:\n";
		do{
			str += ptr.obj.gid + " ";
			ptr = ptr.next;
		}while(ptr != rear.next)
		console.log(str);
	}
	

    return that;
	
}());


var Game = function(w, b, gid){

	var that = this,//reference in event functions
		disconnected = false;

	that.wPlayer = w;
	that.bPlayer = b;
	that.gid = gid;
	that.waitingForPromotion = false;


	console.log("Game started");

	//remove the listener which removes it from the queue (since it no longer is on the queue)
	that.wPlayer.removeAllListeners('disconnect');
	that.bPlayer.removeAllListeners('disconnect');

	that.wPlayer.on('disconnect', function(){
		//alert other player if they are there
		if(that.bPlayer != null){
			that.bPlayer.emit('partnerDisconnect');
		}
		//set it to null
		that.wPlayer = null;
		that.destroy();
	});

	that.bPlayer.on('disconnect', function(){
		if(that.wPlayer != null){
			that.wPlayer.emit('partnerDisconnect');
		}
		that.bPlayer = null;
		that.destroy();
	});

	that.wPlayer.on('chat', function(data){
		if(!disconnected){
			that.bPlayer.emit('chat', data);
		}
	});

	that.bPlayer.on('chat', function(data){
		if(!disconnected){
			that.wPlayer.emit('chat', data);
		}
	});

	that.wPlayer.on('movemade', function(data){
		console.log("White player made a move");
		if(!disconnected){
			that.bPlayer.emit('opposing_move', data);
		}
	});
	that.bPlayer.on('movemade', function(data){
		console.log("Black player made a move");
		if(!disconnected){
			that.wPlayer.emit('opposing_move', data);
		}
	});

	that.destroy = function(){
		disconnected = true;
		if(that.wPlayer == null && that.bPlayer == null){
			GameList.removeGame(that.gid);
		}
	}
	//all event listeners to w and b sockets for communication
	that.init();

	return that;
};
Game.prototype = {
	wPlayer : null,
	bPlayer : null,
	init: function(){
		//send messages to wPlayer and bPlayer that game has started, and give them the color assigned (since they may not know the color)
		this.wPlayer.emit("matchfound. Welcome to Anarchy Chess", {
			color: 'W'
		});
		this.bPlayer.emit("matchfound. Welcome to Anarchy Chess", {
			color: 'B'
		});
	}
}



io.sockets.on('connection', function (sk) {
	var w = null,
	b = null,
	skColor = false;
	console.log("web socket connection recieved");

	//setup event. server processes data to set up  game
	sk.on('setup', function (data) {
  	 //whenever client disconnect from server
  	 sk.on('disconnect', function(){
		//boolean conv and check whether they are players of same color 
  	 	if(!!queue[skColor]){
			//index of player queue position
  	 		var index = queue[skColor].indexOf(sk);
  	 		console.log("Removing player from queue");
			//remove from queue
  	 		queue[skColor].splice(index,1);
  	 	}
  	 });
  	 console.log(data);
  	 skColor = data.color;
  	 if(!skColor){skColor = 'U';}

  	 if(skColor == 'W'){
	 //.shift() removes first value and returns it. 
  	 	if(queue['B'].length > 0){
  	 		b = queue['B'].shift();
  			
  			GameList.addGame(sk, b);
  		}
  		else if(queue['U'].length > 0){
  			b = queue['U'].shift();
  			
  			GameList.addGame(sk, b);
  		}
  		else{
  			queue['W'].push(sk);
  		}
  	}
  	else if(skColor == 'B'){
  		if(queue['W'].length > 0){
  			w = queue['W'].shift();
  			
  			GameList.addGame(w, sk);
  		}
  		else if(queue['U'].length > 0){
  			w = queue['U'].shift();
  			
  			GameList.addGame(w, sk);
  		}
  		else{
  			queue['B'].push(sk);
  		}
  	}
  	else{ 
  		//either white or no color specified, add player to whichever queue is waiting for oponent
  		if(queue['W'].length > 0){
  			w = queue['W'].shift();
  			GameList.addGame(w, sk);
  		}
  		else if(queue['B'].length > 0){
  			b = queue['B'].shift();
  			GameList.addGame(sk, b);
  		}
  		else if(queue['U'].length > 0){
			//default to white
  			w = queue['U'].shift();
  			
  			GameList.addGame(w, sk);
  		}
  		else{
  			queue['U'].push(sk);
  		}
  	}

  });
});
