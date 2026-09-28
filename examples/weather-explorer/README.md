# Weather Explorer

A small, dependency-free browser app for exploring `data/environment/weather.csv`. It lets you filter observations by city and inclusive date range, then summarizes average temperature and total precipitation for the selection.

City names are joined from `data/cities/cities.csv` using `city_id`; unmatched IDs remain visible as IDs rather than being incorrectly matched. The interface labels temperature in degrees Celsius (°C) and precipitation in millimeters (mm).

## Run locally

From the repository root, start any static file server, for example:

```sh
python -m http.server 8000
```

Open `http://localhost:8000/examples/weather-explorer/`. The explorer fetches the CSV files from the repository's `data/` directory, so it must be served over HTTP rather than opened as a `file://` URL.

## Tests

Run the focused tests with Node.js:

```sh
node --test examples/weather-explorer/weather-data.test.mjs
```
