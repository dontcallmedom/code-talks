function CodePlayer(url, selector, options) {
    this.url = url;
    this.lines = [];
    this.options = (options ? options : {});
    var self = this;
    var jQelement = $(selector);
    var played, frozen, cursor, nextStep, displayMode;

    function init () {
	displayMode = (self.options["mode"]=="show" ? "show" : "type"); // "type" for progressive display, "show" for diret display
	played = [""];
	frozen = false;
	cursor = { line:0,col:0};
	nextStep = function() {};
	this.onFinish = function() {};
    };

    this.start = function () {
	init();
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
		url: self.url, dataType:'text', 
		success:function(data) {self.lines = data.split("\n");  playLines(self.lines);},
		error: function(err) { console.log(error);}}
	);
	jQelement.after("<p id='instr'></p>");
    };

    this.restart = function() {
	init();
	message("");
	playLines(this.lines);
    };

    this.freeze = function() {
	frozen = true;
    };

    this.unfreeze = function() {
	frozen = false;
    };

    function playLines(lines) {
	playLine(lines[0]+"\n",
		 function () {
		     if (lines.length > 1) {
			 playLines(lines.slice(1));
		     } else {
			 message("Finished!");
			 self.freeze();
			 self.onFinish();			 
		     }
		 });
    }

    function finishLine(next) {
        cursor.line = played.length;
	cursor.col=0;
	played.push("");
	prettyPrint();	 
	next();
    }

    function message(text) {
	$("#instr").text(text);
    }

    function pause(next) {
	if (displayMode == "type") {
	    message("Press spacebar to continue");
            nextStep = next;		    
	} else {
	    next();
	}
    }

    function unpause() {
	if (!frozen) {
	    message("");
	    nextStep();
	}
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
		    if (displayMode == "type") {
			setTimeout(function() { playLine(line.slice(1), next);}, 10);	
		    } else {
			playLine(line.slice(1), next);
		    }

		} else {
		    finishLine(next);
		}
	    }
	}
    }

};
