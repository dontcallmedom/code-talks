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
     if (line.length > 0) {
	 if (line[0] == '#' || line[0]=='@') {
	   var command = line[0];
	   var comp = line.slice(1).split(":");
	   var cur = comp[0].split(",");
	   cursor.line = parseInt(cur[0],10);
	   var col = parseInt(cur[1],10);
	   console.log(col);
	   if (col >= 0) {
  	       cursor.col = col;
	   } else {
  	       cursor.col = played[cursor.line].length + col - 1;
	   }
	   console.log(cursor.col);
	   line = comp.slice(1).join(":");
	   if (command=='#') { // insert new line
               var queue = played.slice(cursor.line) ;
               played = played.slice(0,cursor.line).concat("",queue) ;	       
	   } else if (command=='@') {
	       // remove extraneous "\n"
	       line = line.slice(0,-1);
	   }
       }
       var newline = played[cursor.line].slice(0,cursor.col) +  line[0] + played[cursor.line].slice(cursor.col);
       played[cursor.line] = newline;
       play.html();
       play.text(played.join(""));
       cursor.col++;
       if (line.length > 1 ) {
         setTimeout(function() { playLine(line.slice(1), next);}, 50);	 
       } else {
         cursor.line = played.length;
	 cursor.col=0;
	 played.push("");
	 next();
	 prettyPrint();
       }
     }
 }


 function readError (error) {
     console.log(error);
 }
 $.ajax({url: "example-data", dataType:'text', success: playCode, error: readError});

});