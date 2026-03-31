#!/bin/bash
set -e

# ============================================================
# Code Annotator — Automated Demo Recording
# ============================================================

DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_RAW="$DEMO_DIR/demo-raw.mp4"
OUTPUT="$DEMO_DIR/demo.mp4"
SAMPLE="$DEMO_DIR/sample.ts"

pause() { sleep "${1:-1}"; }

typetext() {
  local text="$1"
  local delay="${2:-0.02}"
  osascript <<EOF
tell application "System Events"
  set textToType to "$text"
  repeat with i from 1 to length of textToType
    keystroke (character i of textToType)
    delay $delay
  end repeat
end tell
EOF
}

keycombo() {
  osascript -e "tell application \"System Events\" to keystroke \"$1\" using {$2}"
}

keypress() {
  osascript -e "tell application \"System Events\" to key code $1"
}

RETURN_KEY=36

echo "==> Setting up Cursor..."
cursor --reuse-window "$SAMPLE"
pause 3
osascript -e 'tell application "Cursor" to activate'
pause 2

echo "==> Starting screen recording..."

ffmpeg -y \
  -f avfoundation \
  -framerate 30 \
  -capture_cursor 1 \
  -pixel_format uyvy422 \
  -i "1:none" \
  -c:v libx264 -preset ultrafast -crf 18 -pix_fmt yuv420p \
  "$OUTPUT_RAW" &
FFMPEG_PID=$!
pause 2

echo "==> Running demo sequence..."

# ---- SCENE 1: Select lines 11-13 and annotate ----
keycombo "g" "control down"
pause 0.5
typetext "11"
keypress $RETURN_KEY
pause 0.5

osascript -e 'tell application "System Events"
  key code 125 using {shift down}
  key code 125 using {shift down}
  key code 119 using {shift down}
end tell'
pause 0.6

osascript -e 'tell application "System Events" to keystroke "a" using {command down, shift down}'
pause 0.8

typetext "No input validation - add schema validation with zod"
pause 0.3
keypress $RETURN_KEY
pause 1.2

# ---- SCENE 2: Select lines 21-22 and annotate ----
keycombo "g" "control down"
pause 0.5
typetext "21"
keypress $RETURN_KEY
pause 0.5

osascript -e 'tell application "System Events"
  key code 125 using {shift down}
  key code 119 using {shift down}
end tell'
pause 0.6

osascript -e 'tell application "System Events" to keystroke "a" using {command down, shift down}'
pause 0.8

typetext "Leaking internal fields - use a DTO to filter response"
pause 0.3
keypress $RETURN_KEY
pause 1.2

# ---- SCENE 3: Select line 33-34 and annotate ----
keycombo "g" "control down"
pause 0.5
typetext "31"
keypress $RETURN_KEY
pause 0.5

osascript -e 'tell application "System Events"
  key code 125 using {shift down}
  key code 119 using {shift down}
end tell'
pause 0.6

osascript -e 'tell application "System Events" to keystroke "a" using {command down, shift down}'
pause 0.8

typetext "Insecure token - use JWT with proper signing"
pause 0.3
keypress $RETURN_KEY
pause 1.2

# ---- SCENE 4: Pause to show all highlights + status bar ----
pause 1.5

# ---- SCENE 5: Collect annotations via command palette ----
keycombo "p" "command down, shift down"
pause 0.8
typetext "Collect Annotations"
pause 0.6
keypress $RETURN_KEY
pause 1.5

# ---- SCENE 6: Open new file and paste ----
keycombo "n" "command down"
pause 1
keycombo "v" "command down"
pause 2

# ---- END ----
echo "==> Stopping recording..."
kill -INT $FFMPEG_PID 2>/dev/null || true
wait $FFMPEG_PID 2>/dev/null || true
pause 1

if [ ! -f "$OUTPUT_RAW" ]; then
  echo "==> ERROR: Raw recording not found."
  exit 1
fi

echo "==> Adding background music..."

DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT_RAW" | cut -d. -f1)
DURATION=${DURATION:-30}

# Generate warm ambient pad using aevalsrc (proven to produce audible output)
ffmpeg -y \
  -f lavfi -i "aevalsrc=sin(2*PI*130.81*t)*0.3+sin(2*PI*196*t)*0.2+sin(2*PI*261.63*t)*0.15+sin(2*PI*329.63*t)*0.1:s=44100:d=${DURATION}" \
  -af "lowpass=f=600,volume=3.0,afade=t=in:st=0:d=3,afade=t=out:st=$((DURATION-3)):d=3" \
  -c:a aac -b:a 128k \
  "$DEMO_DIR/bg-music.m4a" 2>/dev/null

# Merge video + music
ffmpeg -y \
  -i "$OUTPUT_RAW" \
  -i "$DEMO_DIR/bg-music.m4a" \
  -c:v copy -c:a aac -b:a 128k -shortest \
  "$OUTPUT" 2>/dev/null

rm -f "$OUTPUT_RAW" "$DEMO_DIR/bg-music.m4a"

echo "==> Demo recorded to: $OUTPUT"
ls -lh "$OUTPUT"
