# Data Visualization Gallery

A lightweight, dependency-free browser gallery built directly from the repository's CSV files. It includes city population, institution enrollment, AQI, weather, railway station, route, and public-service views. Each visualization names and links to its source, explains its purpose, and avoids inferring measures that the files do not contain.

## Run locally

From the repository root, start a local web server:

```sh
python -m http.server 8000
```

Open [http://localhost:8000/examples/](http://localhost:8000/examples/) in a browser. A local server is needed because browsers restrict CSV fetches from `file://` pages. No package installation or build step is required; charts update from the source CSV files when the page is loaded.

## Data and measures

| View | Source file(s) | Purpose |
| --- | --- | --- |
| The shape of the cities | `data/cities/cities.csv` | Compare recorded city population values. |
| Students, by institution | `data/education/institutions.csv` | Compare each listed institution's student count. |
| Air quality readings | `data/environment/air_quality.csv` | Compare recorded AQI values by city and date; bars do not imply health categories. |
| Weather, two ways | `data/environment/weather.csv` | Compare temperature and precipitation separately, retaining their units. |
| Rail lines served | `data/transportation/railway_stations.csv` | Compare the number of lines reported for each station. |
| Routes, by type | `data/transportation/routes.csv` | Count listed routes by route type. |
| Services in each city | `data/public_services/hospitals.csv`, `schools.csv`, `public_facilities.csv` | Count listed records per city and service category. |

The available data is a small snapshot. The gallery shows recorded values as-is and does not estimate ridership, population density, enrollment rates, AQI health bands, or other measures absent from the source files.
