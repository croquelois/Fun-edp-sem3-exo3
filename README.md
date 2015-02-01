# Fun - EDP - Sem3 - Exo3

use node.js (nodejs.org) and node-png (http://github.com/pkrumins/node-png.git)
also after I use ffmpeg to create the video

ffmpeg -framerate 10 -i exo3-0-%03d.png -r 30 -b:v 1M -crf 10 out.webm

