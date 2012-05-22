jQuery(document).ready(function ($) {
 var play = $("#play");
 played = [""];
 cursor = {line:0,col:0};
 function playCode (data) {
     var lines = data.split("\n");
     playLines(lines);
 }
 function playLines(lines) {
     playLine(lines[0]+"\n", function () { if (lines.length > 1) playLines(lines.slice(1));});
 }
 function playLine(line, next) {
     function finishLine() {
         cursor.line = played.length;
	 cursor.col=0;
	 played.push("");
	 next();
	 prettyPrint();	 
     }

     if (line.length > 0) {
	 if (line[0] == '#') {
	   var command = line[1];
	   var comp = line.slice(2).split("§");
	   line = comp.slice(1).join("§");
	   var search = comp[0];
	   console.log(search);
	   var text = played.join("");
	   var match = text.indexOf(search);
	   if (match === -1) {
	       finishLine();
	   } else {
	       console.log(match);
	       var head = text.slice(0,match);
	       console.log(head);
	       // Calculate line
	       cursor.line = head.split("\n").length - 1;
	       // Calculate column if appending
	       if (command == "a") {
		   cursor.col = match - head.lastIndexOf("\n") + search.length - 1;
		   // remove extraneous "\n"
		   line = line.slice(0,-1);
	       } else if (command == "i") {
		   console.log("Insert " + line + " before " + search + " at line " + cursor.line);
		   cursor.col = 0;
		   var queue = played.slice(cursor.line) ;
		   played = played.slice(0,cursor.line).concat("",queue) ;	       
	       }
	       console.log(cursor);
	   }
       }
       var newline = played[cursor.line].slice(0,cursor.col) +  line[0] + played[cursor.line].slice(cursor.col);
       played[cursor.line] = newline;
       play.html();
       play.text(played.join(""));
       cursor.col++;
       if (line.length > 1 ) {
         setTimeout(function() { playLine(line.slice(1), next);}, 10);	 
       } else {
	   finishLine();
       }
     }
 }


 function readError (error) {
     console.log(error);
 }
 $.ajax({url: "example-data", dataType:'text', success: playCode, error: readError});

});