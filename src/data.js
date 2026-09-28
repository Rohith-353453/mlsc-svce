export const weatherRows = [
  { record_id: "W1", city_id: "C1", date: "2026-09-01", temp_c: 28.5, precipitation_mm: 0 },
  { record_id: "W2", city_id: "C2", date: "2026-09-01", temp_c: 22.1, precipitation_mm: 1.2 },
  { record_id: "W3", city_id: "C3", date: "2026-09-01", temp_c: 18.9, precipitation_mm: 5.5 }
];

export const cities = [
  { city_id: "C1", name: "Techville", state: "TX", population: 150000, latitude: 32.77, longitude: -96.79 },
  { city_id: "C2", name: "Dataport", state: "CA", population: 80000, latitude: 37.77, longitude: -122.41 },
  { city_id: "C3", name: "Innovia", state: "NY", population: 300000, latitude: 40.71, longitude: -74 }
];

export function joinWeatherToCities(rows, cityList) {
  const cityById = new Map(cityList.map((city) => [city.city_id, city]));
  return rows.map((row) => ({ ...row, city: cityById.get(row.city_id) ?? null }));
}

export function filterWeather(rows, { cityId = "all", date = "" } = {}) {
  return rows.filter((row) => (cityId === "all" || row.city_id === cityId) && (!date || row.date === date));
}

export function summarizeWeather(rows) {
  if (!rows.length) return { averageTemp: null, totalPrecipitation: 0, wettest: null };
  return {
    averageTemp: rows.reduce((sum, row) => sum + row.temp_c, 0) / rows.length,
    totalPrecipitation: rows.reduce((sum, row) => sum + row.precipitation_mm, 0),
    wettest: rows.reduce((wettest, row) => row.precipitation_mm > wettest.precipitation_mm ? row : wettest, rows[0])
  };
}
