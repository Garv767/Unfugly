# Unfugly

**Revamp your Academia with a unified dashboard and auto-generated downloadable timetable**

Unfugly is a Chrome extension that enhances the SRM Academia portal experience by providing a cleaner interface, unified dashboard, and powerful features for managing your academic data.

## Features

### 🎯 Unified Dashboard
- **Attendance Tracking**: View all your attendance data in a single, organized view
- **Marks Overview**: Quick access to your marks and component-wise breakdown
- **Timetable Management**: Auto-generated, visually appealing timetable

### ✏️ Timetable Customization
- **Edit Slots**: Click on unallocated slots to add custom entries
- **Save & Load**: Persistent storage of your timetable edits
- **Download**: Export your timetable as an image
- **Share**: Share your timetable with friends

### 📊 Data Visualization
- Real-time attendance percentage tracking
- Classes-to-skip and classes-to-attend calculator
- Component-wise marks breakdown
- Attendance trend indicators

## Installation

### From Source
1. Go to Chrome Web Store and add [Unfugly](https://chromewebstore.google.com/detail/lfjlfkbcnoioefacgcjanjdiodphnoce?utm_source=item-share-cb)

2. Click add to chrome (or whichever browser you are currently on)

3. Yaa, that's it
## Usage

1. Navigate to [SRM Academia](https://academia.srmist.edu.in/)
2. Log in with your credentials
3. The extension will automatically enhance your experience with:
   - A redesigned interface with custom styling
   - Quick access to attendance and marks data
   - An interactive timetable with edit capabilities

### Editing Your Timetable(Under development)
1. Click on any unallocated (grey) slot in your timetable
2. Enter the course title and classroom (optional) when prompted
3. Changes are automatically saved to your browser storage
4. Use the "Hide" button to toggle visibility of custom edits

### Downloading Your Timetable
1. Look for the download button in the timetable section
2. Click to generate and download a PNG image of your timetable

## Project Structure

```
Unfugly/
├── manifest.json              # Extension configuration
├── content.js                 # Main content script
├── editTimetable.js          # Timetable editing functionality
├── styles.css                # Custom styling
├── imageURLScript.js         # Image handling utilities
├── lib/
│   └── html2canvas.min.js    # Screenshot library
├── images/                   # Extension icons and assets
└── README.md                 # This file
```

## Permissions

The extension requires the following permissions:
- `activeTab`: To interact with the current SRM Academia page
- `storage`: To save your timetable edits and preferences

## Development

### Key Files
- **content.js**: Handles DOM manipulation, data extraction, and UI enhancements
- **editTimetable.js**: Manages timetable editing, saving, and loading functionality
- **styles.css**: Custom styles for the enhanced interface

## Browser Compatibility

- Google Chrome (recommended)
- Microsoft Edge
- Other Chromium-based browsers

## Contributing

Contributions are welcome! Feel free to:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Known Issues

- Some features may require the page to fully load before becoming active

## Support

If you encounter any issues or have suggestions:
1. Check if you're on the latest version (v1.04.1)
2. Try refreshing the page
3. Check the browser console for error messages
4. Open an issue on GitHub with details about the problem

## License

This project is intended for personal and educational use by SRM students.


**Note**: This extension is not officially affiliated with SRM Institute of Science and Technology. It is a student-created tool to enhance the user experience of the Academia portal.
