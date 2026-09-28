# Examples
This directory will contain example solutions submitted by participants.

## Weather Explorer

The standalone explorer in [`weather-explorer/`](weather-explorer/) filters weather observations by city and date, summarizes temperature (°C) and precipitation (mm), and displays daily rainfall. City names are looked up by `city_id` in `data/cities/cities.csv`; unmatched ids remain visible as ids.

Serve the repository root over HTTP, then open `/examples/weather-explorer/` in a browser. For example, from the repository root run `python -m http.server 8000` and visit `http://localhost:8000/examples/weather-explorer/`. The explorer reads the source CSV files directly and needs no build step.

Run its focused tests with `node --test tests/weather-explorer.test.mjs`.
