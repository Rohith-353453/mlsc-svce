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

This repository includes a dependency-free weather explorer in `index.html`. Run
`python3 -m http.server` from the repository root, then open
`http://localhost:8000` to browse temperature (`°C`) and precipitation (`mm`)
by city and date. The explorer joins weather records to
`data/cities/cities.csv` using `city_id`.

## For Organizers
To populate the GitHub issues automatically:
1. Go to the "Actions" tab in this repository.
2. Select the "Create Event Issues" workflow.
3. Click "Run workflow".
This will read the markdown files in `tasks/issues/` and create them as issues.
