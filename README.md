This tool allows to display a code source progressively in an HTML page (with syntax highlighting from [code-prettify](http://code.google.com/p/google-code-prettify/)) according to a script.

That script uses the following syntax:
* any line not starting with a # will be displayed as a regular line of code
* a line starting with a # starts a special operation
* #p means that the viewer should pause before interpreting the next line (and until spacebar is hit)
* #a and #i allows to add code to a line, resp. to insert a new line of code
* the position of the code to be added/inserted is determined by the string before the "§" character; the first match in the code displayed so far determines where the code is appended/inserted
* the actual code to be inserted is the one that appears after the "§"
* #@ allows to show the content of an external resource (e.g. to give explanations); the url of the resource to be included needs to follow the @ sign, e.g. #@foo.html will include foo.html