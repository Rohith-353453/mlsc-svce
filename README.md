# Dev Days Open Data

Welcome to the Dev Days open-data event repository! 
This is a community open-data repository for the Dev Days event.

## Core Message
Explore the data. Pick an issue. Build something useful.

## Domains
We provide data across 5 domains:
1. Cities
2. Education
3. Environment
4. Transportation
5. Public Services

## How to participate
1. Read the [Getting Started Guide](docs/getting-started.md).
2. Explore the [Data Dictionary](docs/data-dictionary.md).
3. Check out the [Issues Index](tasks/issues.md) or the repository's GitHub Issues tab to find a challenge.
4. Build a solution using any language, framework, or tools you prefer. We highly encourage using GitHub Copilot to help build your application!
5. Follow our [Contributing Guide](CONTRIBUTING.md) to submit a Pull Request.

## Weather Explorer

Open `index.html` through a local static server to browse the weather dataset with city and date
filters. For example, run `npx serve .` from the repository root, then open the local URL shown in
the terminal. The explorer joins `weather.csv` to `cities.csv` using `city_id` and displays
temperature in °C and precipitation in mm.

## For Organizers
To populate the GitHub issues automatically:
1. Go to the "Actions" tab in this repository.
2. Select the "Create Event Issues" workflow.
3. Click "Run workflow".
This will read the markdown files in `tasks/issues/` and create them as issues.
