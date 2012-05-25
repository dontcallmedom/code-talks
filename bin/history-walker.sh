#!/bin/bash
PREV=""
for i in `git rev-list --reverse $1 -- $2` ;
  do
  if [ -n "$PREV" ] ;
  then
     git difftool -y --extcmd bin/spiff-wrapper.sh $PREV $i -- $2
     echo "#p"
  fi
  PREV=$i;
done