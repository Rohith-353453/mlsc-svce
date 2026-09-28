# City Signals

City Signals is a no-build, responsive visual atlas for the repository datasets. It loads the CSV files in `data/` at runtime and presents four deliberately bounded views:

- **Urban scale:** a population comparison using `cities.csv`.
- **Atmosphere:** paired AQI, temperature, and precipitation readings by city.
- **Civic capacity:** listed institution, station, hospital-bed, facility, and school counts.
- **Connection:** a station-to-station route sketch from `routes.csv` and `railway_stations.csv`.

## Run locally

From the repository root, serve the folder over HTTP so the browser can fetch the CSV files:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000/examples/>.
