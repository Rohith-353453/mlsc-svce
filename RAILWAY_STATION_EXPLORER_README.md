# Railway Station Explorer

A modern web application for searching and filtering railway stations by name, city, and service capacity.

## 🎯 Features

- **Search by Station Name**: Type to search for stations by name (e.g., "Central", "North", "Grand")
- **Filter by City**: Select a city from the dropdown to see only stations in that city
- **Filter by Line Count**: Filter stations by the number of lines they serve
- **Real-time Results**: Filters update instantly as you type or select options
- **Reset Filters**: Quickly clear all filters with one click
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## 📋 Acceptance Criteria Met

✅ **Users can search station names** - The search input allows real-time filtering by station name  
✅ **Filter by city** - City dropdown filter with dynamic population from the data  
✅ **Filter by line count** - Line count dropdown filter with all available options  
✅ **Station records display their actual fields** - Cards show `station_id`, `name`, `city_id`, and `lines`  
✅ **City labels use valid city_id matches** - City names are looked up from `cities.csv` and displayed as badges  

## 🚀 Usage

### Local Development

1. Navigate to the project root directory
2. Start a simple HTTP server:
   ```bash
   python -m http.server 8000
   # Or for Python 2:
   # python -m SimpleHTTPServer 8000
   ```
3. Open your browser to: `http://localhost:8000/railway-station-explorer.html`

### Deployment

1. Copy `railway-station-explorer.html` to your web server
2. Ensure the `data/` directory structure is accessible from the same server
3. Access the application via your web server

## 📊 Data Sources

The application uses two CSV files:

### `data/transportation/railway_stations.csv`
- `station_id`: Unique identifier (e.g., S1, S2, S3)
- `name`: Station name (e.g., "Techville Central")
- `city_id`: Reference to city (e.g., C1, C2, C3)
- `lines`: Number of lines served by the station (integer)

### `data/cities/cities.csv`
- `city_id`: Unique city identifier
- `name`: City name
- `state`: State abbreviation
- Other fields: population, latitude, longitude

## 🎨 Design

The application features:
- **Modern UI**: Gradient background with clean card-based layout
- **Responsive Grid**: Auto-adjusting columns for various screen sizes
- **Visual Hierarchy**: Clear labels, badges, and visual distinction between elements
- **Accessibility**: Semantic HTML, proper labels, and focus states
- **Performance**: Client-side filtering with no server overhead

## 🔧 Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript (no dependencies)
- **Styling**: CSS3 with Grid and Flexbox
- **Data Loading**: Fetch API with CSV parsing
- **Filtering**: Real-time client-side filtering

### Key Functions
- `loadCSV()`: Fetches and loads CSV files
- `parseCSV()`: Parses CSV data into JavaScript objects
- `applyFilters()`: Applies all active filters to the dataset
- `renderResults()`: Renders filtered results as HTML cards
- `populateFilters()`: Dynamically populates filter dropdown options

### Error Handling
- Try-catch blocks for data loading
- User-friendly error messages
- XSS protection via HTML escaping

## 🧪 Testing

The application handles various scenarios:
- ✅ Empty search results
- ✅ Single filter application
- ✅ Multiple filter combinations
- ✅ Reset functionality
- ✅ Data parsing from CSV format
- ✅ City name lookup validation

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## 👨‍💻 Development Notes

### CSV Parsing
The application includes a robust CSV parser that:
- Handles comma-separated values
- Trims whitespace
- Skips empty rows
- Maps values to column headers

### Filter Logic
Filters are applied using AND logic:
- Search term AND City filter AND Line count filter
- Any empty filter is ignored
- Results update in real-time

### Performance
- No external dependencies (lightweight)
- Client-side filtering (no server load)
- Efficient DOM updates
- Optimized CSS for smooth animations

## 📄 Issue Reference

This solution addresses issue **#07-transport-explorer** (Public Transport Explorer)

Resolves the requirement to: "Explore railway stations and routes with city/state lookup"

## 🤝 Contributing

Feel free to enhance this application by:
- Adding sorting options (by name, city, lines)
- Implementing route exploration
- Adding state-level filtering
- Creating export functionality (CSV, JSON)
- Adding visualization (charts, maps)
