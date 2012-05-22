function CodePlayer(url, selector) {
    this.url = url;
    this.self = this;
    this.lines = [];
    this.initialized = false;
    var jQelement = $(selector);
    var played = [""];
    var cursor = { line:0,col:0};
    var nextStep = function() {};

    this.init = function () {
	window.addEventListener(
	    "keydown",
	    function(event) {
		var key;
		if (window.event)
		    key = window.event.keyCode;
		else if (event.which)
		key = event.which;
		if (key == 32) {
		    unpause();
		}
	    });
	$.ajax(
	    {
		url: "example-data", dataType:'text', 
		success:function(data) {this.lines = data.split("\n"); this.initialized = true; playLines(this.lines);},
		error: function(err) { console.log(error);}});
    };

    function playLines(lines) {
	playLine(lines[0]+"\n", function () { if (lines.length > 1) playLines(lines.slice(1));});
    }

    function finishLine(next) {
        cursor.line = played.length;
	cursor.col=0;
	played.push("");
	prettyPrint();	 
	next();
    }

    function pause(next) {
        nextStep = next;	
    }

    function unpause() {
	nextStep();
    }

    function setCursor(search, mode) {
	var text = played.join("");
	var match = text.indexOf(search);
	if (match === -1) {
	    finishLine(next);
	} else {
	    console.log(match);
	    var head = text.slice(0,match);
	    console.log(head);
	    // Calculate line
	    cursor.line = head.split("\n").length - 1;
	    // Calculate column if appending
	    if (mode == "a") {
		cursor.col = match - head.lastIndexOf("\n") + search.length - 1;
	    } else if (mode == "i") {
		cursor.col = 0;
		var queue = played.slice(cursor.line) ;
		played = played.slice(0,cursor.line).concat("",queue) ;	       
	    }
	    console.log(cursor);
	}	
    }

    function playLine(line, next) {
	var command = "";
	if (line.length > 0) {
	    if (line[0] == '#') {
		command = line[1];
		if (command != "p") {
		    var comp = line.slice(2).split("§");
		    line = comp.slice(1).join("§");
		    var search = comp[0];
		    setCursor(search, command);
		    // remove extraneous "\n"
		    if (command == "a") 
			line = line.slice(0,-1);
		}
	    }
	    if (command == "p") {
		pause(next);
	    } else {
		var newline = played[cursor.line].slice(0,cursor.col) +  line[0] + played[cursor.line].slice(cursor.col);
		played[cursor.line] = newline;
		jQelement.html();
		jQelement.text(played.join(""));
		cursor.col++;
		if (line.length > 1 ) {
		    setTimeout(function() { playLine(line.slice(1), next);}, 10);	 
		} else {
		    finishLine(next);
		}
	    }
	}
    }

};


jQuery(document).ready(function ($) {
  var player = new CodePlayer("example-data", "#play");
  player.init();
});