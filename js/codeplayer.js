function CodePlayer(url, script, selector, options) {
    this.url = url;
    this.script = new URI(script);
    this.lines = [];
    this.options = (options ? options : {});
    var self = this;
    var jQelement = $(selector);
    var displayed, frozen, offset, currentInsert, inserts, offsetErase, nextStep, displayMode, prevDisplayMode, codeContainer, slideContainer, paused, started, nopause, postContentTo, lastScrollPoint, ffwd, stepNumber, currentStep, delay, onceDone;

    function init () {
	jQelement.addClass("codeplayer");
	codeContainer = $("<pre class='front prettyprint'></pre>").appendTo(jQelement);
	slideContainer = $("<div class='back'></div>").appendTo(jQelement);
	displayMode = (displayMode ? displayMode : (self.options["mode"]=="show" ? "show" : "type")); // "type" for progressive display, "show" for direct display
	postContentTo = (postContentTo ? postContentTo : (self.options["postContentTo"] ? self.options["postContentTo"] : ""));
	nopause = (nopause ? nopause : (self.options["nopause"]==true));
	displayed = "";
	frozen = false;
	paused = false;
	ffwd = false;
	started = false;
	currentInsert = {};
	currentStep = 0;
	offset = 0;
	lastScrollPoint = 0;
	inserts = [];
	delay = 0;
	nextStep = function() {};
	onceDone = function() {};
	self.onFinish = function() {};
	self.onStarted = function() {};
	self.onSwitch = self.onSwitch ? self.onSwitch : function() {};
	self.onShow = function() {};
	self.onUnfreeze = self.onUnfreeze ? self.onUnfreeze :  function() {};
	self.onStep = function() {};
	window.addEventListener("popstate",
				function (event) {
				    var state = event.state;
				    if (state) {
					self.gotoStep(state.step);
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
		    event.preventDefault();
		}
	    });
	//jQelement.click(unpause);
	$.ajax(
	    {
		url: self.script, dataType:'text',
		success:function(data) {
		    stepNumber = data.split("\n#p").length ;
		    console.log(stepNumber);
		    self.lines = data.split("\n");  
		    playLines(self.lines); 
		    started = true;
		    self.onStarted();
		},
		error: function(err) { console.log(err);}}
	);
	jQelement.after("<p id='instr'></p>");
    };

    this.restart = function() {
	init();
	message("");
	playLines(this.lines);
    };

    this.length = function() {
	return stepNumber;
    };

    this.currentStep = function() {
	return currentStep;
    }

    this.show = function() {
	codeContainer.show();	
	self.onShow();
    };

    this.hide = function() {
        codeContainer.addClass("back");
    };

    this.freeze = function() {
	frozen = true;
    };

    this.unfreeze = function() {
	frozen = false;
	if (!started) {
	    self.start();
	    self.onStarted = self.onUnfreeze;
	} else {
	    self.onUnfreeze();
	}
    };

    function finish() {
	message("Finished!");
	prettyPrint();
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

    function scrollTo(pos) {
	console.log("scrolling to " + pos);
	var text = codeContainer.text();
	// we target 5 lines above the insertion point
	pos = text.slice(0,pos).split("\n").slice(0, -5).join("\n").length;
	// We don't scroll if we're already within 5 lines
	if (text.slice(Math.min(pos, lastScrollPoint), Math.max(pos, lastScrollPoint)).split("\n").length < 5) {
	    return;
	}
	lastScrollPoint = pos;
	codeContainer.text(text.slice(0, pos));
	var scrollAnchor = $("<ins></ins>");
	codeContainer.append(scrollAnchor);
	codeContainer.append($("<span></span>").text(text.slice(pos)));
	delay = 500;
	$.scrollTo(scrollAnchor, delay, {onAfter: function() { delay = 0;}});
    }


    function highlightInserts(inserts, code, baseOffset) {
	if (inserts.length) {
	    var insert = inserts[0];
	    if (baseOffset < insert.offset) {
		codeContainer.append($("<span></span>").text(code.slice(baseOffset,insert.offset)));
	    }
	    if (insert.content.length) {
		codeContainer.append($("<ins></ins>").text(insert.content));		    
	    }
	    highlightInserts(inserts.slice(1), code, insert.offset + insert.content.length);
	} else {
	    // insert code
	    if (baseOffset < code.length) {
		codeContainer.append($("<span></span>").text(code.slice(baseOffset)));
	    }
	    prettyPrint();
	}
    }

    function finishLine(next) {
	if (!ffwd) {
	    prettyPrint();
	}
	next();
    }

    function message(text) {
	$("#instr").text(text);
    }

    this.gotoStep = function (step) {
	ffwd = step;
	displayMode = "show";
	if (step < currentStep) {
	    self.restart();
	} else {
	    unpause();
	}
    };

    function pause(next) {
	if (postContentTo) {
	    $.post(postContentTo, {file:self.url, content: codeContainer.text()});
	}
	currentStep++;
	if (!ffwd || currentStep >= ffwd)
	    paused = true;
	if (!nopause && (!ffwd || currentStep >= ffwd)) {
	    if (!ffwd || currentStep >= ffwd) {
		displayMode = "type";
		ffwd = false;
		if (currentStep > 1) {
		    var text = codeContainer.text();
		    codeContainer.html("");
		    highlightInserts(inserts, text, 0);
		}
		inserts = [];
	    }
	    message("Press spacebar to continue");
            nextStep = next;
	} else {
	    next();
	}
	if (!ffwd) {
	    manageHistory();
	    self.onStep();
	}
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
	var state = {step: currentStep};
	history.pushState(state, "Step " + currentStep, "#s" + currentStep);
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
	    timeout = 1;
	}
	if (displayMode == "type" && currentStep > 0) {
	    setTimeout(fn, timeout);	
	    } else {
		fn();
	    }
    }

    function insertCharacter(character, pos) {
	var text = codeContainer.text();
	displayed = text.slice(0,pos) + character + text.slice(pos);
	codeContainer.text(displayed);	
	//prettyPrint();
    }

    function removeCharacter(pos) {
	var text = codeContainer.text();
	displayed = text.slice(0,pos - 1) + text.slice(pos);
	codeContainer.text(displayed);
    }    

    function playCharacter(line, next) {
	var character = line[0];
	insertCharacter(character, offset);
	currentInsert.content += character;
	offset++;
	if (line.length > 1 ) {
	    execute(function()  { playCharacter(line.slice(1), next);} );
	} else {
	    inserts.push({offset:currentInsert.offset,content:currentInsert.content});
	    currentInsert = {offset:offset,content:""};
	    finishLine(next);
	}
    }

    function eraseCharacter(next) {
	if (offsetErase > offset) {
	    removeCharacter(offsetErase);
	    offsetErase --;
	    //execute(function() { eraseCharacter(next);}, 2);	    
	    eraseCharacter(next);
	} else {
	    finishLine(next);
	}
    }

    function showInclude(url, next) {
	var iframe = $("<iframe width='100%'></iframe>");
	var relUrl = new URI(url);
	iframe.attr("src",relUrl.resolve(self.script));
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
		offset = Math.max(displayed.slice(0,displayed.slice(0,offset).lastIndexOf("\n")).lastIndexOf("\n") + 1, 0);
	    }
	    if (command == "#") {
		command = "";
		line = line.slice(1);
	    }
	}
	if (command != "p" && command != "s" && command != "@") {
  	    if ((!ffwd || ffwd < currentStep) && currentStep > 0)
		scrollTo(offset);
	}
	if (command == "") {
	    line += "\n";
	}
	if (command == "a" || command =="b" || command == "$" || command == "^" || command == "-") {
	    currentInsert.offset = offset;
	} else if (command == "r" || command == "@" || command == "p" || command == "s") {
	    currentInsert.content = "";
	} else if (command == "") {
	    if (currentInsert.content == "") {
		currentInsert.offset = offset;
	    }
	}
	if (command == "p") {
	    pause(next);
	} else if (command == "@") {
	    // #@foo means show "foo" in an iframe in slideContainer
	    if (line.length > 2) {
		showInclude(line.slice(2), next);
	    }
	} else if (command == "s") {
	    self.onSwitch(line.slice(2));
	    pause(next);
	} else if (command == "r") {
	    setTimeout(function() { eraseCharacter(next);}, delay);
	} else if (command != "") {
	    finishLine(next);
	} else {
	    jQelement.removeClass("flip");
	    // Reinit code shown
	    setCode(displayed);
	    currentInsert = {offset: offset, content: ""};
	    setTimeout(function() { playCharacter(line,next);}, delay);
	}
    }

};
