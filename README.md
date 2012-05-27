This tool allows to display a code source progressively in an HTML page (with syntax highlighting from [code-prettify](http://code.google.com/p/google-code-prettify/)) according to a script.

That script uses the following syntax:
* any line not starting with a # will be displayed as a regular line of code
* a line starting with a # starts a special operation
* #p means that the viewer should pause before interpreting the next line (and until spacebar is hit)
* #a (resp #b) moves the insert point after (resp before) to the first match of the string following the command
* #$ moves to end of file
* #^ moves to start of file
* #- moves to previous line
* #r allows to remove the code present between two pieces of code; the two pieces are the first match of the strings separated by "→"
* #@ allows to show the content of an external resource (e.g. to give explanations); the url of the resource to be included needs to follow the @ sign, e.g. #@foo.html will include foo.html
* #s triggers the user-customizable onSwitch() function with the rest of the line as parameter; it can be used to switch e.g. to another code player


See it [in action on an example](http://dontcallmedom.github.com/code-talks/player.html).