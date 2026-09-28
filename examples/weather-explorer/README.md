# Weather Atlas

A small, dependency-free browser explorer for `data/environment/weather.csv`. It includes city-name lookups from `data/cities/cities.csv`, date and city filters, summary metrics, a temperature/precipitation chart, and a sortable-by-date observation list.

## Run locally

The page fetches the repository CSV files, so open it through a local HTTP server rather than directly from disk. From the repository root:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000/examples/weather-explorer/>.

Temperature values are shown in degrees Celsius (`°C`); precipitation values are shown in millimeters (`mm`). City labels are joined with the `city_id` column. If a city ID has no matching city record, the explorer displays the ID itself rather than inventing a city name.
