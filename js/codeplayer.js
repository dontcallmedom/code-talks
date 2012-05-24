function CodePlayer(start, script, selector, options) {
    this.start = start;    
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
	    {   url: self.start, dataType:'text',
		success:function(data) {
		    displayed = data;
		    codeContainer.text(data);
		    prettyPrint();
		    $.ajax(
			{
			    url: self.script, dataType:'text', 
			    success:function(data) {self.blocks = data.split(/^([0-9].*\n)/).map(function(val,idx,array) { if (!(idx % 2)) { return array[idx] + array[idx+1];}});  playBlocks(self.blocks); started = true;},
			    error: function(err) { console.log(err);}}
		    );
		},
		error: function(err) { console.log(err);}}
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
	    playBlock(blocks[0],
		     function () {
			 if (blocks.length > 1) {
			     playBocks(blocks.slice(1));
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
	offset += line.indexOf("_");
	var character = line[line.indexOf("_") + 1];
	insertCharacter(character, offset);
	if (line.split("_").length > 1 ) {
	    execute(function()  { playCharacter(line.slice(line.indexOf("_")), next);} );
	} else {
	    finishLine(next);
	}
    }

    function eraseCharacter(line, next) {
	offsetErase = offset + line.lastIndexOf("_") + 1;
	offset += line.indexOf("_") + 1;
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

    function playBlock(block, next) {
	command = block[0];
	if (command == "#p") {
	    pause(next);
	} else {
	    var diff = block.slice(1).split("\n");;
	    // TODO input error management
	    var paramRegex = new RegExp("([0-9]+),?([0-9]+)?([adc])([0-9]+),?([0-9]+)?");
	    var params = command.match(paramRegex).slice(1);
	    // 1,2a1 => params=[1,2,'a',1,null]
	    var operation = params[2];
	    offset = displayed.split("\n").slice(params[0]).join("\n").length;
	    for (var i = 0 ; i<diff.length; i++) {
		var diffline = diff[i];
		if (operation == "a") {
		    playCharacter(diffline, next);
		} else if (operation == "d") {
		    eraseCharacter(diffline, next);
		} else if (operation == "c") {
		    insertline = diff[i+2];
		    eraseCharacter(diffline, 
				    function () {
					playCharacter(insertline, next);
				    });
		    break;
		}
	    }
	}
    }
};
