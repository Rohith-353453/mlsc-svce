export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  return (records || []).map((record) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), (record[index] || "").trim()]))
  );
}

export function joinWeatherData(weatherText, citiesText) {
  const cities = new Map(parseCsv(citiesText).map((city) => [city.city_id, city]));
  return parseCsv(weatherText)
    .filter((reading) => cities.has(reading.city_id))
    .map((reading) => {
      const city = cities.get(reading.city_id);
      return {
        ...reading,
        cityName: `${city.name}, ${city.state}`,
        temperature: Number(reading.temp_c),
        precipitation: Number(reading.precipitation_mm),
      };
    });
}

export function filterWeatherData(readings, cityId = "", date = "") {
  return readings.filter((reading) =>
    (!cityId || reading.city_id === cityId) && (!date || reading.date === date)
  );
}
