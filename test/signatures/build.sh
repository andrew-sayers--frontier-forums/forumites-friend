#!/bin/sh

DEBUG=
#DEBUG=echo

WIDTH_BOUNDARY=650
for HEIGHT_BOUNDARY in 90 120 150
do
    for HEIGHT in $( seq $((HEIGHT_BOUNDARY-1)) $((HEIGHT_BOUNDARY+1))  )
    do
        for WIDTH in $( seq $((WIDTH_BOUNDARY-1)) $((WIDTH_BOUNDARY+1))  )
        do
            NAME="$WIDTH"x"$HEIGHT"
            $DEBUG convert \
                -size $(($WIDTH - 2))x$(($HEIGHT - 2)) \
                -background '#DEF' \
                -bordercolor black -border 1 \
                -gravity center -font Verdana-Regular -pointsize 20 caption:"$NAME" \
                "$NAME.png"
        done
    done
done