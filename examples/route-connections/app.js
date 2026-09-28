const ROUTES_URL = "../../data/transportation/routes.csv";
const STATIONS_URL = "../../data/transportation/railway_stations.csv";

const elements = {
  routeCount: document.querySelector("#route-count"),
  stationCount: document.querySelector("#station-count"),
  missingCount: document.querySelector("#missing-count"),
  visibleCount: document.querySelector("#visible-count"),
  status: document.querySelector("#data-status"),
  integrityNotice: document.querySelector("#integrity-notice"),
  integrityCount: document.querySelector("#integrity-count"),
  routeList: document.querySelector("#route-list"),
  emptyState: document.querySelector("#empty-state"),
  search: document.querySelector("#search"),
  typeFilter: document.querySelector("#type-filter"),
  startFilter: document.querySelector("#start-filter")
};

let routes = [];
let stationsById = new Map();

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
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
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  if (quoted) throw new Error("The CSV contains an unterminated quoted field.");
  if (rows.length === 0) return [];

  const headers = rows.shift().map((header) => header.trim().replace(/^\uFEFF/, ""));
  return rows.map((values) => Object.fromEntries(
    headers.map((header, index) => [header, (values[index] ?? "").trim()])
  ));
}

async function fetchCsv(url, requiredHeaders) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status}).`);

  const records = parseCsv(await response.text());
  if (records.length === 0) throw new Error(`No records were found in ${url}.`);

  const missingHeaders = requiredHeaders.filter((header) => !(header in records[0]));
  if (missingHeaders.length > 0) {
    throw new Error(`${url} is missing required column${missingHeaders.length > 1 ? "s" : ""}: ${missingHeaders.join(", ")}.`);
  }
  return records;
}

function endpointFor(stationId) {
  if (!stationId) return { name: "Missing station ID", missing: true, sourceId: "" };
  const station = stationsById.get(stationId);
  if (!station) return { name: "Unmatched station", missing: true, sourceId: stationId };
  return { name: station.name || "Unnamed station", missing: false, sourceId: stationId };
}

function appendText(parent, tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function buildRouteCard(route) {
  const start = endpointFor(route.start_station_id);
  const end = endpointFor(route.end_station_id);
  const card = document.createElement("article");
  card.className = "route-card";

  const meta = document.createElement("div");
  meta.className = "route-meta";
  appendText(meta, "span", "route-id", route.route_id || "Unidentified route");
  appendText(meta, "span", "route-badge", route.type || "Unspecified type");
  card.append(meta);

  const path = document.createElement("div");
  path.className = "route-path";
  appendEndpoint(path, "FROM", start);

  const connector = document.createElement("div");
  connector.className = "path-connector";
  connector.setAttribute("aria-hidden", "true");
  appendText(connector, "span", "path-arrow", "›");
  path.append(connector);

  appendEndpoint(path, "TO", end);
  card.append(path);

  const state = document.createElement("div");
  state.className = `route-state${start.missing || end.missing ? " is-warning" : ""}`;
  if (start.missing || end.missing) {
    state.textContent = [start, end]
      .filter((endpoint) => endpoint.missing)
      .map((endpoint) => endpoint.sourceId
        ? `Unmatched ID: ${endpoint.sourceId}`
        : "Missing station ID")
      .join(" · ");
    state.setAttribute("aria-label", `Endpoint data issue: ${state.textContent}`);
  } else {
    state.textContent = "Both endpoints matched";
  }
  card.append(state);

  return card;
}

function appendEndpoint(parent, label, endpoint) {
  const wrapper = document.createElement("div");
  wrapper.className = `endpoint${endpoint.missing ? " endpoint-missing" : ""}`;
  appendText(wrapper, "div", "endpoint-label", label);
  appendText(wrapper, "div", "endpoint-name", endpoint.name);
  appendText(wrapper, "div", "endpoint-id", endpoint.sourceId
    ? `ID: ${endpoint.sourceId}`
    : "No ID in route record");
  parent.append(wrapper);
}

function populateFilters() {
  const types = [...new Set(routes.map((route) => route.type).filter(Boolean))].sort();
  for (const type of types) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    elements.typeFilter.append(option);
  }

  const starts = [...new Set(routes.map((route) => route.start_station_id).filter(Boolean))]
    .map((id) => ({ id, endpoint: endpointFor(id) }))
    .sort((left, right) => left.endpoint.name.localeCompare(right.endpoint.name));
  for (const { id, endpoint } of starts) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = endpoint.missing
      ? `Unmatched station (${id})`
      : `${endpoint.name} (${id})`;
    elements.startFilter.append(option);
  }
}

function routeMatchesSearch(route, query) {
  if (!query) return true;
  const start = endpointFor(route.start_station_id);
  const end = endpointFor(route.end_station_id);
  return [
    route.route_id,
    route.type,
    route.start_station_id,
    route.end_station_id,
    start.name,
    end.name
  ].some((value) => value.toLocaleLowerCase().includes(query));
}

function render() {
  const query = elements.search.value.trim().toLocaleLowerCase();
  const routeType = elements.typeFilter.value;
  const startId = elements.startFilter.value;
  const visibleRoutes = routes.filter((route) =>
    (!routeType || route.type === routeType) &&
    (!startId || route.start_station_id === startId) &&
    routeMatchesSearch(route, query)
  );

  elements.routeList.replaceChildren(...visibleRoutes.map(buildRouteCard));
  elements.visibleCount.textContent = String(visibleRoutes.length);
  elements.emptyState.hidden = visibleRoutes.length > 0;
}

function renderSummary() {
  const unresolvedRoutes = routes.filter((route) =>
    endpointFor(route.start_station_id).missing || endpointFor(route.end_station_id).missing
  ).length;

  elements.routeCount.textContent = String(routes.length).padStart(2, "0");
  elements.stationCount.textContent = String(stationsById.size).padStart(2, "0");
  elements.missingCount.textContent = String(unresolvedRoutes).padStart(2, "0");
  elements.integrityCount.textContent = String(unresolvedRoutes);
  elements.integrityNotice.hidden = unresolvedRoutes === 0;
}

function resetFilters() {
  elements.search.value = "";
  elements.typeFilter.value = "";
  elements.startFilter.value = "";
  render();
}

async function initialize() {
  try {
    const [stationRecords, routeRecords] = await Promise.all([
      fetchCsv(STATIONS_URL, ["station_id", "name"]),
      fetchCsv(ROUTES_URL, ["route_id", "type", "start_station_id", "end_station_id"])
    ]);

    stationsById = new Map(stationRecords
      .filter((station) => station.station_id)
      .map((station) => [station.station_id, station]));
    routes = routeRecords;

    populateFilters();
    renderSummary();
    render();
    elements.status.textContent = "";
  } catch (error) {
    elements.status.dataset.state = "error";
    elements.status.textContent = `${error.message} Check that both CSV files are available from a local web server and contain their expected columns.`;
  }
}

elements.search.addEventListener("input", render);
elements.typeFilter.addEventListener("change", render);
elements.startFilter.addEventListener("change", render);
document.querySelector("#reset-filters").addEventListener("click", resetFilters);
document.querySelector("#empty-reset").addEventListener("click", resetFilters);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.focus();
  }
  if (event.key === "Escape" && document.activeElement === elements.search) {
    elements.search.value = "";
    render();
    elements.search.blur();
  }
});

initialize();
