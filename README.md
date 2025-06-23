# PostItWall

## Project Overview
PostItWall is an interactive application that allows museum visitors to create digital post-it notes that are analyzed and displayed on a visual dashboard. The project consists of a React frontend for user interaction and a Python backend for processing and analyzing the notes.

## Prerequisites
- Node.js and npm
- Python 3.8 or higher
- Git
- OpenAI API key
- Cisco VPN client for database access
- Fontys credentials

## Installation

### Clone the Repository
```bash
git clone https://github.com/ConnorEMcclanahan/PhillipsWall.git
cd PhillipsWall
```

### Frontend Setup
```bash
cd Frontend
npm install
```

### Backend Setup
```bash
pip install Flask
pip install Pyodbc
pip install Portkey_AI
```

## Configuration

### OpenAI API Setup
1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add your API key to the appropriate configuration file in the backend

### Database Connection Setup
1. Install Cisco VPN client from Fontys Student Services website (available in the webhosting section)
2. Connect to VPN using your Fontys credentials
3. The application will now be able to connect to the database using the credentials in `database.ini`

### Required Configuration Files
Make sure you have these files in the `Backend/config/` folder before running the application:
- `database.ini` - Database connection settings
- `portkey.ini` - API key configuration

## Running the Application

### Start the Backend
```bash
# From the root project directory
python -m Backend.main
```

### Start the Frontend
```bash
# From the Frontend directory
npm start
```

The frontend application will start running on `http://localhost:3000`

## Network Access

### Accessing from Other Devices on the Network
To make the application accessible from other devices on your network, you can use Local Tunnel:

#### Install Local Tunnel
```bash
npm install -g localtunnel
```

#### Expose Backend
```bash
lt --port 5000
```
This will provide a URL that can be used to access your backend from any device.

#### Expose Frontend
```bash
lt --port 3000
```
This will provide a URL that can be used to access your frontend from any device.

## Project Structure
```
PhillipsWall/
├── Frontend/          # React application for user interface
├── Backend/           # Python server handling data processing and AI analysis
│   └── config/        # Configuration files
│       ├── database.ini
│       └── portkey.ini
└── README.md
```

## Features
- Multilingual support (English and Dutch)
- Post-it note text recognition
- Sentiment analysis visualization
- Interactive Stats page for museum staff

## Troubleshooting

If you encounter any issues:

1. **Dependencies**: Ensure all dependencies are installed correctly
2. **Ports**: Check that both frontend and backend are running on the correct ports
3. **Network**: Verify network connectivity if using Local Tunnel
4. **Logs**: Check console logs for any error messages
5. **VPN**: Verify VPN connection is active when accessing the database
6. **API Key**: Confirm your OpenAI API key is valid and has sufficient credits

## Support
For additional support or questions, please refer to the project documentation or contact the development team.
