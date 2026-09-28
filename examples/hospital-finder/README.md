# Hospital Finder

A responsive, dependency-free directory for searching hospitals by name or hospital ID, filtering by city, and setting a minimum bed capacity. City names are looked up by `city_id` in `data/cities/cities.csv`, and every capacity is labeled in beds.

## Run locally

From the repository root, start a local web server:

```sh
python -m http.server 8000
```

Then open [http://localhost:8000/examples/hospital-finder/](http://localhost:8000/examples/hospital-finder/). The page fetches its data from the repository's `data/` directory, so it needs to be served over HTTP rather than opened directly as a file.
