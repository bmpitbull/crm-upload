# CRM Mobile App

A React Native mobile application for field service workers that integrates with your CRM system. The app provides route management, appointment tracking, and voice note capabilities.

## Features

### ✅ Implemented Features
- **Authentication**: Login/logout with JWT tokens
- **Background Geotracking**: Automatically tracks location when logged in (sends to server, not visible to user)
- **Daily Routes**: View assigned routes with business stops
- **Business Details**: View business information and contacts
- **Appointments**: View today's appointments with status tracking
- **Voice Notes**: Add notes to contacts (voice input placeholder implemented)
- **Modern UI**: Clean, intuitive interface with iOS/Android native styling

### 🔄 Background Location Tracking
- Runs only when user is logged in
- Sends location data to server every 30 seconds or 10 meters
- No location data shown to user in the app
- Automatically stops when user logs out

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (for iOS testing) or Android Studio (for Android testing)

### Installation

1. **Navigate to the mobile app directory:**
   ```bash
   cd CRMMobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on device/simulator:**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your phone

### Backend Integration

The mobile app connects to your CRM backend at `http://localhost:3000`. Make sure your backend is running before testing the mobile app.

## API Endpoints Used

The mobile app uses these backend endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/routes` - Fetch daily routes
- `GET /api/businesses/:id/full` - Get business details with contacts
- `POST /api/contacts/:id/notes` - Add notes to contacts
- `GET /api/appointments?date=YYYY-MM-DD` - Get appointments for a date
- `POST /api/location/track` - Send location data (background tracking)

## App Structure

```
CRMMobile/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx          # Login interface
│   │   ├── RoutesScreen.tsx         # Daily routes view
│   │   ├── BusinessDetailsScreen.tsx # Business details
│   │   ├── AppointmentsScreen.tsx   # Today's appointments
│   │   └── AddNoteScreen.tsx        # Add voice/text notes
│   ├── context/
│   │   ├── AuthContext.tsx          # Authentication state
│   │   └── LocationContext.tsx      # Background location tracking
│   └── services/
│       └── api.ts                   # API service with auth
├── App.tsx                          # Main app with navigation
└── app.json                         # Expo configuration
```

## Navigation Flow

1. **Login Screen** → User enters credentials
2. **Main Tabs** (after login):
   - **Routes Tab**: View daily routes and business stops
   - **Appointments Tab**: View today's appointments
3. **Business Details**: Tap on route stop to view business details
4. **Add Note**: Add voice/text notes to contacts

## Voice Input Implementation

Currently, the voice input is a placeholder. To implement full speech-to-text:

1. Install `expo-voice`:
   ```bash
   npx expo install expo-voice
   ```

2. Update `AddNoteScreen.tsx` to use `expo-voice` instead of the placeholder

## Deployment

### For Production

1. **Build for iOS:**
   ```bash
   npx expo build:ios
   ```

2. **Build for Android:**
   ```bash
   npx expo build:android
   ```

3. **Submit to App Store/Play Store:**
   ```bash
   npx expo submit:ios
   npx expo submit:android
   ```

### For Testing

Use Expo Go app to test on physical devices:
1. Install Expo Go from App Store/Play Store
2. Scan QR code from `npx expo start`
3. App will load on your device

## Configuration

### API Base URL
Update the API base URL in `src/services/api.ts` if your backend runs on a different port or host.

### Location Permissions
The app requests location permissions for background tracking. Users can deny these, but background tracking won't work.

## Troubleshooting

### Common Issues

1. **Metro bundler issues:**
   ```bash
   npx expo start --clear
   ```

2. **iOS Simulator not working:**
   - Make sure Xcode is installed
   - Run `xcrun simctl list` to see available simulators

3. **Android Emulator not working:**
   - Make sure Android Studio is installed
   - Start an AVD (Android Virtual Device)

4. **Backend connection issues:**
   - Ensure backend is running on port 3000
   - Check network connectivity
   - Verify API endpoints are working

### Debug Mode

Enable debug mode to see API calls and location tracking:
```bash
npx expo start --dev-client
```

## Security Notes

- JWT tokens are stored securely using AsyncStorage
- Location data is only sent to your server, not stored locally
- All API calls include authentication headers
- Background location tracking stops immediately on logout

## Future Enhancements

- Real-time route updates
- Offline mode with sync
- Push notifications for route changes
- Enhanced voice input with speech-to-text
- Route optimization
- Photo attachments for notes
- Customer signature capture

## Support

For issues or questions about the mobile app, check the Expo documentation or create an issue in your project repository.
