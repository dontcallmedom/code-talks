This tool allows to display a code source progressively in an HTML page (with syntax highlighting from [code-prettify](http://code.google.com/p/google-code-prettify/)).

The code is displayed based on its evolution captured in a script file; that script file is most easily generated via git, with a special diff tool, [spiff](https://github.com/dontcallmedom/spiff).

Store each of the step of the file you want to walk through as a git commit, and then generate the script to be used by the player with:
  SPIFF=/path/to/spiff bin/history-walker.sh <firstcommitref> <filename>

The output of that command can then be used as the script for the player.

In addition to the diff, the script can also accept the following commands (in between diff blocks):
* #p to pause the player

See it [in action on an example](http://dontcallmedom.github.com/code-talks/player.html).