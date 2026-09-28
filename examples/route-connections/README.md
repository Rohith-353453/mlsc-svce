# Rail Link: Route Connections

A responsive, dependency-free interface for exploring the recorded connections in `data/transportation/routes.csv`. It joins route endpoints to `data/transportation/railway_stations.csv` by exact `station_id` only. Missing IDs and IDs with no matching station record remain visible on their route cards and are included in the data-integrity summary.

## Run locally

From the repository root, start a static server:

```sh
python -m http.server 8000
```

Then open [http://localhost:8000/examples/route-connections/](http://localhost:8000/examples/route-connections/).

The app fetches the repository CSV files at runtime, so opening `index.html` directly as a `file://` URL is not supported.

## Explore

- Search by route ID, route type, station name, or station ID.
- Filter by route type or starting station.
- Use `/` to focus search and `Esc` to clear it.
- Unmatched station references show their recorded source IDs instead of guessing a station name.
