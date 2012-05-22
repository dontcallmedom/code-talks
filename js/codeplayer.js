function CodePlayer(url, selector, options) {
    this.url = new URI(url);
    this.lines = [];
    this.options = (options ? options : {});
    var self = this;
    var jQelement = $(selector);
    var played, frozen, offset, nextStep, displayMode, prevDisplayMode, codeContainer, slideContainer;

    function init () {
	jQelement.addClass("codeplayer");
	codeContainer = $("<pre class='front prettyprint'></pre>").appendTo(jQelement);
	slideContainer = $("<div class='back'></div>").appendTo(jQelement);
	displayMode = (displayMode ? displayMode : (self.options["mode"]=="show" ? "show" : "type")); // "type" for progressive display, "show" for direct display
	played = [""];
	frozen = false;
	offset = 0;
	nextStep = function() {};
	this.onFinish = function() {};
	this.onStep = manageHistory;
	window.addEventListener("popstate",
				function (event) {
				    var state = event.state;
				    offset = state.offset;
				    nextStep = function() {};
				    played = state.played;
				    setCode(state.played.join("\n"));
				    prettyPrint();
				    playLines(self.lines.slice(played.length - 1));
				});
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
	playLine(lines[0],
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
	offset = played.join("\n").length;
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
	this.onStep();
    }

    function unpause() {
	if (!frozen) {
	    message("");
	    nextStep();
	}
    }

    function manageHistory() {
	var state = {played:played, offset:offset};
	console.log("Setting state");
	console.log(state);
	history.pushState(state, "Step " + played.length, "#s" + played.length);
    }

    function setOffset(search, mode) {
	var text = played.join("\n");
	var match = text.indexOf(search);
	if (match === -1) {
	    finishLine(next);
	} else {
	    var head = text.slice(0,match);
	    if (mode == "a") { // appending
		offset = match + search.length ;
	    } else if (mode == "i") { // inserting
		offset = head.lastIndexOf("\n") ;
		offset = (offset >0 ? offset : 0);
		var line = head.split("\n").length - 1;
		var queue = played.slice(line) ;
		played = played.slice(0,line).concat("",queue) ;	       
	    }
	}	
    }

    function setCode(code) {
	codeContainer.html();
	codeContainer.text(code);	
    }

    function playCharacter(line, next) {
	var character = line[0];
	var text = codeContainer.text();
	text = text.slice(0,offset) + character + text.slice(offset);
	played = text.split("\n");
	codeContainer.text(text);
	offset++;	
	if (line.length > 1 ) {
	    if (displayMode == "type") {
		setTimeout(function() { playCharacter(line.slice(1), next);}, 10);	
	    } else {
		playCharacter(line.slice(1), next);
	    }
	} else {
	    finishLine(next);
	}
    }

    function playLine(line, next) {
	var command = "";
	if (line.length > 0) {
	    if (line[0] == '#') {
		command = line[1];
		if (command == "a" || command == "i") {
		    var comp = line.slice(2).split("§");
		    line = comp.slice(1).join("§");
		    var search = comp[0];
		    setOffset(search, command);
		    // remove extraneous "\n"
		    if (command == "a") 
			line = line.slice(0,-1);
		}
	    }
	    if (command == "p") {
		pause(next);
	    } else if (command == "@") {
		// #@foo means show "foo" in an iframe in slideContainer
		if (line.length > 2) {
		    var iframe = $("<iframe width='100%'></iframe>");
		    var relUrl = new URI(line.slice(2));
		    iframe.attr("src",relUrl.resolve(self.url));
		    slideContainer.html();
		    slideContainer.append(iframe);
		    iframe.attr("height",codeContainer.get(0).clientHeight);
		    jQelement.addClass("flip");		    
		}
		setTimeout(function() {finishLine(next);}, 400);
	    } else {
		jQelement.removeClass("flip");
		// Reinit code shown
		setCode(played.join("\n"));
		playCharacter(line,next);
	    }
	}
    }

};
