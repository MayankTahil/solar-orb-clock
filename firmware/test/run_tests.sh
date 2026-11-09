#!/usr/bin/env bash
# Build and run the firmware core tests on the desktop against the shared
# Skyfield golden fixtures. Requires a C compiler (gcc/clang). No Arduino
# toolchain needed — this validates the math, not the device drivers.
set -e
cd "$(dirname "$0")"

# Regenerate flat fixtures if the JSON source is newer
if [ ! -f fixtures_flat.txt ] || [ ../../tests/fixtures/astronomy_fixtures.json -nt fixtures_flat.txt ]; then
  python3 ../tools/make_c_fixtures.py
fi

gcc -std=c11 -Wall -Wextra -Werror -I../src \
    test_astronomy.c ../src/astronomy.c ../src/render.c -lm -o test_astronomy
gcc -std=c11 -Wall -Wextra -Werror -I../src \
    test_color.c ../src/color_engine.c -lm -o test_color

./test_astronomy
./test_color
