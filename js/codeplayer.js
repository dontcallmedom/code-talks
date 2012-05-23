function CodePlayer(url, selector, options) {
    this.url = new URI(url);
    this.lines = [];
    this.options = (options ? options : {});
    var self = this;
    var jQelement = $(selector);
    var displayed, frozen, offset, insert, offsetErase, nextStep, displayMode, prevDisplayMode, codeContainer, slideContainer, currentLine, paused, started, beyondFirstStep, nopause;

    function init () {
	jQelement.addClass("codeplayer");
	codeContainer = $("<pre class='front prettyprint'></pre>").appendTo(jQelement);
	slideContainer = $("<div class='back'></div>").appendTo(jQelement);
	displayMode = (displayMode ? displayMode : (self.options["mode"]=="show" ? "show" : "type")); // "type" for progressive display, "show" for direct display
	nopause = (nopause ? nopause : (self.options["nopause"]==true));
	displayed = "";
	frozen = false;
	paused = false;
	beyondFirstStep = false;
	started = false;
	offset = 0;
	currentLine = 0;
	insert = {content:""};
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
		success:function(data) {self.lines = data.split("\n");  playLines(self.lines); started = true;},
		error: function(err) { console.log(err);}}
	);
	jQelement.after("<p id='instr'></p>");
    };

    this.restart = function() {
	init();
	message("");
	playLines(this.lines);
    };

    this.show = function() {
	codeContainer.show();	
    };

    this.hide = function() {
	codeContainer.hide();	
    };

    this.freeze = function() {
	frozen = true;
    };

    this.unfreeze = function() {
	frozen = false;
	if (!started) {
	    self.start();
	}
    };

    function finish() {
	message("Finished!");
	self.freeze();
	//self.onFinish();			 	
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
	if (insert.offset != null) {
	    if (beyondFirstStep) {
		var text = codeContainer.text();
		codeContainer.text(text.slice(0,insert.offset));
		codeContainer.append($("<strong></strong>").text(insert.content));
		var tmp = $("<div></div>").text(text.slice(insert.offset + insert.content.length));
		codeContainer.append(tmp);
	    }
	}
	currentLine++;
	prettyPrint();
	next();
    }

    function message(text) {
	$("#instr").text(text);
    }

    function pause(next) {
	beyondFirstStep = true;
	paused = true;
	if (!nopause) {
	    message("Press spacebar to continue");
            nextStep = next;
	} else {
	    next();
	}
	this.onStep();
    }

    function unpause() {
	if (!frozen && paused) {
	    //removeCharacter(offset);
	    paused = false;
	    message("");
	    nextStep();
	}
    }

    function manageHistory() {
	var state = {displayed:displayed, offset:offset, currentLine:currentLine};
	history.pushState(state, "Step " + currentLine, "#s" + currentLine);
    }

    function calculatePosition(search, before) {
	if (!before) {
	    before = false;
	}
	var match = displayed.indexOf(search);
	if (match === -1) {
	    return -1;
	} else {
	    if (before) {
		return match;
	    } else {
		return match + search.length;
	    }
	}
    }

    function setCode(code) {
	codeContainer.html();
	codeContainer.text(code);	
    }

    function execute(fn, timeout) {
	if (!timeout) {
	    timeout = 10;
	}
	if (displayMode == "type") {
	    setTimeout(fn, timeout);	
	    } else {
		fn();
	    }
    }

    function insertCharacter(character, pos) {
	var text = codeContainer.text();
	displayed = text.slice(0,pos) + character + text.slice(pos);
	codeContainer.text(displayed);	
    }

    function removeCharacter(pos) {
	var text = codeContainer.text();
	displayed = text.slice(0,pos - 1) + text.slice(pos);
	codeContainer.text(displayed);
    }

    function playCharacter(line, next) {
	var character = line[0];
	insertCharacter(character, offset);
	offset++;
	if (line.length > 1 ) {
	    execute(function()  { playCharacter(line.slice(1), next);} );
	} else {
	    finishLine(next);
	}
    }

    function eraseCharacter(next) {
	if (offsetErase > offset) {
	    removeCharacter(offsetErase);
	    offsetErase --;
	    execute(function() { eraseCharacter(next);}, 2);	    
	    //eraseCharacter(next);
	} else {
	    finishLine(next);
	}
    }

    function showInclude(url, next) {
	var iframe = $("<iframe width='100%'></iframe>");
	var relUrl = new URI(url);
	iframe.attr("src",relUrl.resolve(self.url));
	slideContainer.html();
	slideContainer.append(iframe);
	iframe.attr("height",codeContainer.get(0).clientHeight);
	jQelement.addClass("flip");		    	
	var el = jQelement.bind("webkitTransitionEnd oTransitionEnd MSTransitionEnd transitionend",
				function () {
				    finishLine(next);
				    jQelement.unbind("webkitTransitionEnd oTransitionEnd MSTransitionEnd transitionend",el);
				});	
    }

    function playLine(line, next) {
	var command = "";
	if (line.length > 0 && line[0] == '#') {
	    command = line[1];
	    if (command == "a" || command == "b" || command == "r") {
		var search = line.slice(2).split("→")[0];
		var pos = calculatePosition(search, (command == "b"));
		if (offset == -1) {
		    finishLine(next);
		} else {
		    offset = pos;
		}
		if (command == "r") {
		    var until = line.slice(2).split("→").slice(1).join("→");
		    offsetErase = calculatePosition(until, true);
		}
	    } else if (command == "$") {
		offset = displayed.length;
	    } else if (command == "^") {
		offset = 0;
	    } else if (command == "-") {
		offset = Math.max(displayed.slice(0,offset).lastIndexOf("\n") - 1, 0);;
	    }
	    if (command == "#") {
		command = "";
		line = line.slice(1);
	    }
	}
	if (command == "") {
	    line += "\n";
	}
	if (command == "a" || command =="b" || command == "$" || command == "^" || command == "-") {
	    insert.offset = offset;
	} else if (command == "r" || command == "@" || command == "p") {
	    insert.content = "";
	} else if (command == "") {
	    if (insert.content == "") {
		insert.offset = offset;
	    }
	    insert.content += line;		
	}
	if (command == "p") {
	    pause(next);
	} else if (command == "@") {
	    // #@foo means show "foo" in an iframe in slideContainer
	    if (line.length > 2) {
		showInclude(line.slice(2), next);
	    }
	} else if (command == "r") {
	    eraseCharacter(next);
	} else if (command != "") {
	    finishLine(next);
	} else {
	    jQelement.removeClass("flip");
	    // Reinit code shown
	    setCode(displayed);
	    playCharacter(line,next);		    
	}
    }

};
