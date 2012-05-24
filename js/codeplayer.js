function CodePlayer(startfile, script, selector, options) {
    this.startfile = startfile;
    this.script = new URI(script);
    this.blocks = [];
    this.options = (options ? options : {});
    var self = this;
    var jQelement = $(selector);
    var displayed, frozen, offset, insert, offsetErase, nextStep, displayMode, prevDisplayMode, codeContainer, slideContainer, currentBlock, paused, started, beyondFirstStep, nopause;

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
	currentBlock = 0;
	insert = {content:""};
	nextStep = function() {};
	this.onFinish = function() {};
	this.onStep = manageHistory;
	window.addEventListener("popstate",
				function (event) {
				    var state = event.state;
				    if (state) {
					offset = state.offset;
					currentBlock = state.currentBlock;
					nextStep = function() {};
					displayed = state.displayed;
					setCode(displayed);
					prettyPrint();
					playBlocks(self.blocks.slice(currentBlock));	
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
	    {   url: self.startfile, dataType:'text',
		success:function(startcontent) {
		    $.ajax(
			{
			    url: self.script, dataType:'text', 
			    success:function(data) {
				var lines = data.split("\n");
				var regex = /^([0-9].*)/gim, result;
				for (var i = 0; i < lines.length ; i++) {
				    var line = lines[i];
				    if (regex.test(line)) {
					self.blocks.push({command:line, diff:[]});
				    } else if (line == "#p") {
					self.blocks.push({command:line});
				    } else if (self.blocks[self.blocks.length - 1].diff) {
					self.blocks[self.blocks.length - 1].diff.push(line);
				    }
				}
				displayed = startcontent;
				codeContainer.text(startcontent);
				prettyPrint();
				playBlocks(self.blocks);
				started = true;
			    },
			    error: function(err) { console.log(err);}}
		    );
		},
		error: function(err) { console.log(err); console.log(self.startfile);}}
	);
	jQelement.after("<p id='instr'></p>");
    };

    this.restart = function() {
	init();
	message("");
	playBlocks(self.blocks);
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

    function playBlocks(blocks) {
	if (blocks.length) {
	    console.log("Playing block");	    
	    playCommand(blocks[0],
		     function () {
			 if (blocks.length > 1) {
			     playBlocks(blocks.slice(1));
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
		if (insert.content.length) {
		    codeContainer.append($("<strong></strong>").text(insert.content));		    
		}
		var tmp = $("<div></div>").text(text.slice(insert.offset + insert.content.length));
		codeContainer.append(tmp);
	    }
	}
	currentBlock++;
	prettyPrint();
	next();
    }

    function message(text) {
	$("#instr").text(text);
    }

    function pause(next) {
	console.log(next);
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
	    console.log(nextStep);
	    nextStep();
	}
    }

    function manageHistory() {
	var state = {displayed:displayed, offset:offset, currentBlock:currentBlock};
	history.pushState(state, "Step " + currentBlock, "#s" + currentBlock);
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
	    timeout = 200;
	}
	if (displayMode == "type") {
	    setTimeout(fn, timeout);	
	    } else {
		fn();
	    }
    }

    function insertCharacter(character, pos) {
	console.log("inserting " +  character + " at " + pos);
	var text = codeContainer.text();
	displayed = text.slice(0,pos) + character + text.slice(pos);
	codeContainer.text(displayed);	
    }

    function removeCharacter(pos) {
	var text = codeContainer.text();
	console.log("removing " + text[pos - 1]);
	displayed = text.slice(0,pos -1) + text.slice(pos);
	codeContainer.text(displayed);
    }

    function playCharacter(diff, next) {
	console.log("line insert: " + diff);
	var line = diff[0].slice(2);
	if (line && line.indexOf("_") >= 0) {
	    offset += line.indexOf("_");
	    var character = line[line.indexOf("_") + 2];
	    insertCharacter(character, offset);
	    console.log("remaining insert: " + line.split("_").length);
	    if (line.split("_").length > 1 ) {
		execute(function()  { playCharacter(["  "  + line.slice(line.indexOf("_") + 2)].concat(diff.slice(1)),next);} );
	    } else {
		if (diff.length > 1) { 
		    execute(function()  { playCharacter(diff.slice(1), next);});
		} else {
		    finishLine(next);
		}
	    }
	} else {
	    finishLine(next);
	}
    }

    function eraseCharacter(diff, next) {
	console.log("erase line: ");
	console.log(diff);
	var line = diff[0].slice(2);
	console.log("erase line: " + line);
	if (line && line.indexOf("_") >= 0) {
	    offsetErase = offset + line.lastIndexOf("_") - (line.split("_").length - 2 ) *2 + 1;
	    console.log(line.lastIndexOf("_"));
	    console.log(line.split("_").length);
	    console.log("offset erase: " + offsetErase);
	    console.log("line: " + line);
	    //offset += line.indexOf("_") + 1;
	    if (offsetErase > offset) {
		removeCharacter(offsetErase);
		execute(function() { eraseCharacter(["  " + line.slice(0, line.lastIndexOf("_"))].concat(diff.slice(1)), next);});
		//eraseCharacter(line.slice(0, line.lastIndexOf("_")), next);
	    } else {
		if (diff.length > 1) { 
		    execute(function()  { playCharacter(diff.slice(1), next);});
		} else {
		    finishLine(next);
		}
	    }
	} else {
	    finishLine(next);
	}
    }

    function playCommand(block, next) {
	var command = block.command;
	console.log(block);
	if (command == "#p") {
	    console.log("next: " + next);
	    pause(next);
	} else {
	    var diff = block.diff;
	    // TODO input error management
	    var paramRegex = new RegExp("([0-9]+),?([0-9]+)?([adc])([0-9]+),?([0-9]+)?");
	    var params = command.match(paramRegex).slice(1);
	    console.log(params);
	    // 1,2a1 => params=[1,2,'a',1,null]
	    var operation = params[2];
	    if (params[0] > 1) {
		offset = displayed.split("\n").slice(0,params[0] - 1).join("\n").length + 1;
	    } else {
		offset = 0;
	    }
	    console.log("offset command: " + offset);
	    if (operation == "a") {
		playCharacter(diff,next);
	    } else if (operation == "d") {
		eraseCharacter(diff, next);
	    } else if (operation == "c") {
		insertline = [diff[2]];
		eraseCharacter([diff[0]], 
			       function () {
				   playCharacter(insertline, next);
			       });
	    }
	}
    }
};
