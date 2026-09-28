# Weather Explorer

A responsive, dependency-free web app for exploring the synthetic daily weather readings in `data/environment/weather.csv`. It filters by city and date, summarizes temperature and precipitation, and includes per-reading charts and a data table. City names are looked up in `data/cities/cities.csv` by exact `city_id`; readings with no matching city keep their ID as the label.

## Run locally

From the repository root, start a local static server:

```sh
python -m http.server 8000
```

Open [http://localhost:8000/examples/weather-explorer/](http://localhost:8000/examples/weather-explorer/). The app fetches the CSV files using relative paths, so it must be served over HTTP rather than opened directly as a `file://` URL.

Temperature is shown in degrees Celsius (°C), and precipitation is shown in millimeters (mm).
