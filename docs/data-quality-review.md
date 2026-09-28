# Data Quality Review

The repository-root dashboard (`index.html`) runs read-only checks over the nine CSVs in `data/`. It is dependency-free and performs its checks in the browser; it does not write back to source files. Use **Export report** to download a JSON snapshot of check results and evidence.

## Run locally

From the repository root, start a static HTTP server, for example:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. A web server is required because browsers do not allow the dashboard to fetch sibling CSV files from a `file://` page. The same root page can be published with GitHub Pages.

## Checks

The dashboard checks the documented columns in `docs/data-dictionary.md` for blanks and unexpected or missing headers. It checks each dataset's declared primary key for duplicate IDs, detects exact duplicate rows and potential duplicate names, and flags leading or trailing whitespace. It validates numeric types and documented domains, including nonnegative population/student/beds counts, positive railway line counts, latitude and longitude limits, AQI from 0 through 500, nonnegative precipitation, plausible temperature bounds, valid ISO dates, two-letter uppercase state abbreviations, and documented school-level values.

Relationship checks verify every `city_id` against `cities.csv` and both route station IDs against `railway_stations.csv`. A route with the same start and end station is flagged for review. References are reported with the source row and target key.

The AQI, temperature, and station-line limits are review rules rather than source-documented facts: AQI uses the commonly published 0–500 scale; the temperature bounds are broad plausibility checks; and a station serving zero lines is treated as invalid. Adjust these assumptions in `app.js` if a data source defines different semantics.

## Safe corrections

Findings include the file, row, column, observed value, rule, and a recommended next step. Only clearly reversible formatting proposals (such as trimming incidental outer whitespace, uppercasing a two-letter state value, or matching a documented school-level spelling) are suggested as normalizations. Missing facts, identifiers, measurements, duplicate records, and broken references are never guessed or automatically changed; verify those against their source before editing a CSV.
