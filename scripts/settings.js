/**
** Single object (namespace) handling websocket connections
@namespace CHESSAPP
*/

/**
*Chess Resource Folder
* @property imageDir
*/  

var CHESSAPP = {};

CHESSAPP.globalSettings = {
	imageDir : "images/",
	debug : false,
	live: false,
	port: 5000
};

var gameSettings = {
	containerID : "container",
	online: true,
	preferredColor: false
};
