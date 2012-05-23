function CodePlayer(url, selector, options) {
    this.url = new URI(url);
    this.lines = [];
    this.options = (options ? options : {});
    var self = this;
    var jQelement = $(selector);
    var displayed, frozen, offset, nextStep, displayMode, prevDisplayMode, codeContainer, slideContainer, currentLine, paused;

    function init () {
	jQelement.addClass("codeplayer");
	codeContainer = $("<pre class='front prettyprint'></pre>").appendTo(jQelement);
	slideContainer = $("<div class='back'></div>").appendTo(jQelement);
	displayMode = (displayMode ? displayMode : (self.options["mode"]=="show" ? "show" : "type")); // "type" for progressive display, "show" for direct display
	displayed = "";
	frozen = false;
	paused = false;
	offset = 0;
	currentLine = 0;
	nextStep = function() {};
	this.onFinish = function() {};
	this.onStep = manageHistory;
	window.addEventListener("popstate",
				function (event) {
				    var state = event.state;
				    if (state) {
					offset = state.offset;
					currentLine = state.currentLine;
					nextStep = function() {};
					displayed = state.displayed;
					setCode(displayed);
					prettyPrint();
					playLines(self.lines.slice(currentLine));	
				    }
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
	//jQelement.click(unpause);
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

    function finish() {
	message("Finished!");
	self.freeze();
	self.onFinish();			 	
    }

    function playLines(lines) {
	if (lines.length) {
	    playLine(lines[0],
		     function () {
			 if (lines.length > 1) {
			     playLines(lines.slice(1));
			 } else {
			     finish();
			 }
		     });
	} else {
	    finish();
	}
    }

    function finishLine(next) {
	currentLine++;
	prettyPrint();	 
	next();
    }

    function message(text) {
	$("#instr").text(text);
    }

    function pause(next) {
	paused = true;
	if (displayMode == "type") {
	    message("Press spacebar to continue");
            nextStep = next;
	} else {
	    next();
	}
	this.onStep();
    }

    function unpause() {
	if (!frozen && paused) {
	    paused = false;
	    message("");
	    nextStep();
	}
    }

    function manageHistory() {
	var state = {displayed:displayed, offset:offset, currentLine:currentLine};
	history.pushState(state, "Step " + currentLine, "#s" + currentLine);
    }

    function calculatePosition(search, mode) {
	var pos;
	var match = displayed.indexOf(search);
	if (match === -1) {
	    finishLine(next);
	} else {
	    if (mode == "a") { // appending
		pos = match + search.length;
	    } else if (mode == "i") { // inserting
		var head = displayed.slice(0,match);
		pos = head.lastIndexOf("\n");
		pos = (pos > 0 ? pos + 1: 0);
	    }
	}
	return pos;
    }

    function setCode(code) {
	codeContainer.html();
	codeContainer.text(code);	
    }

    function playCharacter(line, next) {
	var character = line[0];
	var text = codeContainer.text();
	displayed = text.slice(0,offset) + character + text.slice(offset);
	codeContainer.text(displayed);
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
		    offset = calculatePosition(search, command);
		}
	    }
	    if (command == "i" || command == "") {
		line += "\n";
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
		var el = jQelement.bind("webkitTransitionEnd oTransitionEnd MSTransitionEnd transitionend",
							     function () {
								 finishLine(next);
								 jQelement.unbind("webkitTransitionEnd oTransitionEnd MSTransitionEnd transitionend",el);
							     });
	    } else {
		jQelement.removeClass("flip");
		// Reinit code shown
		setCode(displayed);
		playCharacter(line,next);
	    }
	}
    }

};
