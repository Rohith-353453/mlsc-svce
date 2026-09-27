# Data Dictionary

## Cities (`data/cities/cities.csv`)
- `city_id` (string): Unique identifier for the city.
- `name` (string): Name of the city.
- `state` (string): State abbreviation.
- `population` (integer): Synthetic population count.
- `latitude` (float): City latitude.
- `longitude` (float): City longitude.

## Education (`data/education/institutions.csv`)
- `institution_id` (string): Unique ID.
- `name` (string): Name of the institution.
- `city_id` (string): Reference to cities.csv.
- `type` (string): e.g., University, College.
- `students` (integer): Number of students.

## Environment - Air Quality (`data/environment/air_quality.csv`)
- `record_id` (string): Unique ID.
- `city_id` (string): Reference to cities.csv.
- `date` (YYYY-MM-DD): Date of reading.
- `aqi` (integer): Air Quality Index.
- `main_pollutant` (string): e.g., PM2.5, Ozone.

## Environment - Weather (`data/environment/weather.csv`)
- `record_id` (string): Unique ID.
- `city_id` (string): Reference to cities.csv.
- `date` (YYYY-MM-DD): Date of reading.
- `temp_c` (float): Temperature in Celsius.
- `precipitation_mm` (float): Rainfall in mm.

## Transportation - Railway Stations (`data/transportation/railway_stations.csv`)
- `station_id` (string): Unique ID.
- `name` (string): Station name.
- `city_id` (string): Reference to cities.csv.
- `lines` (integer): Number of lines served.

## Transportation - Routes (`data/transportation/routes.csv`)
- `route_id` (string): Unique ID.
- `type` (string): e.g., Bus, Train.
- `start_station_id` (string): Starting station.
- `end_station_id` (string): Ending station.

## Public Services
### Hospitals (`data/public_services/hospitals.csv`)
- `hospital_id` (string): Unique ID.
- `name` (string): Hospital name.
- `city_id` (string): Reference to cities.csv.
- `beds` (integer): Capacity.

### Schools (`data/public_services/schools.csv`)
- `school_id` (string): Unique ID.
- `name` (string): School name.
- `city_id` (string): Reference to cities.csv.
- `level` (string): Primary, Secondary, High.

### Public Facilities (`data/public_services/public_facilities.csv`)
- `facility_id` (string): Unique ID.
- `name` (string): Facility name.
- `city_id` (string): Reference to cities.csv.
- `type` (string): Library, Park, Community Center.
