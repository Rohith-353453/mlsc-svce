export function parseCsv(text) {
  const input = text.replace(/^\uFEFF/, "");
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      record.push(field);
      if (record.some((value) => value !== "")) records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (field !== "" || record.length) {
    record.push(field);
    if (record.some((value) => value !== "")) records.push(record);
  }
  if (records.length < 2) return [];

  const [headers, ...data] = records;
  return data.map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

export function joinCities(weatherRows, cityRows) {
  const citiesById = new Map(cityRows.map((city) => [city.city_id, city]));
  return weatherRows.map((row) => ({
    ...row,
    cityName: citiesById.get(row.city_id)?.name || row.city_id,
    temp_c: Number(row.temp_c),
    precipitation_mm: Number(row.precipitation_mm),
  }));
}

export function filterWeather(rows, { cityId = "", fromDate = "", toDate = "" } = {}) {
  return rows
    .filter((row) =>
      (!cityId || row.city_id === cityId)
      && (!fromDate || row.date >= fromDate)
      && (!toDate || row.date <= toDate)
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.city_id.localeCompare(b.city_id));
}

export function summarizeWeather(rows) {
  if (!rows.length) return { count: 0, averageTemperature: null, totalPrecipitation: 0 };
  const temperatureTotal = rows.reduce((total, row) => total + row.temp_c, 0);
  const totalPrecipitation = rows.reduce((total, row) => total + row.precipitation_mm, 0);
  return {
    count: rows.length,
    averageTemperature: temperatureTotal / rows.length,
    totalPrecipitation,
  };
}
