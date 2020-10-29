#!/bin/bash
svgs="weather-clear weather-clear-night weather-few-clouds weather-few-clouds-night weather-fog weather-overcast weather-severe-alert weather-showers weather-showers-scattered weather-snow weather-storm weather-tornado weather-windy"
for svg in $svgs
do
    rsvg-convert -a -w 64 -f svg $svg.svg -o $svg-small.svg
done
