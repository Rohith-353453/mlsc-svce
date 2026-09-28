# Air Quality Trends

A small, dependency-free dashboard for exploring `data/environment/air_quality.csv`.
It groups readings by city, orders them by date, and plots each city's AQI over
time. A trend is only shown when a city has at least three readings on three
distinct dates; shorter series are explicitly marked as insufficient.

## Run locally

From the repository root, start a local web server:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000/examples/air-quality-trends/>. The dashboard
fetches the CSV and city names from the repository, so it must be served over
HTTP rather than opened directly as a `file://` URL.

## Data behavior

- Readings are grouped by `city_id` and sorted by date, with source order
  preserved for readings on the same date.
- The timeline always lists each recorded date and AQI value.
- Three observations on three distinct dates are required before the chart is
  described as a trend. With fewer observations, the chart remains visible but
  the insufficient-data status explains what is missing.
