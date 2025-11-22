# Homebridge SensorPush Plugin

## Overview
This is a Homebridge plugin for integrating SensorPush temperature and humidity sensors with Apple HomeKit. The plugin connects to the SensorPush Gateway Cloud API to retrieve sensor data and expose it to HomeKit.

## Recent Changes
- **November 22, 2025**: Initial plugin creation
  - Implemented OAuth authentication with SensorPush API
  - Created dynamic platform plugin following Homebridge best practices
  - Added automatic sensor discovery and HomeKit accessory registration
  - Implemented temperature, humidity, and battery monitoring
  - Added automatic token refresh and polling system
  - Respects API rate limit of 1 request per minute

## Project Architecture

### Structure
```
homebridge-sensorpush/
├── src/
│   ├── index.ts              # Plugin entry point
│   ├── platform.ts           # Main platform implementation
│   ├── platformAccessory.ts  # Sensor accessory implementation
│   ├── sensorPushApi.ts      # SensorPush API client
│   └── settings.ts           # Constants and configuration
├── dist/                     # Compiled JavaScript output
├── config.schema.json        # Homebridge config UI schema
├── package.json              # NPM package configuration
└── tsconfig.json             # TypeScript configuration
```

### Key Components

1. **SensorPush API Client** (`sensorPushApi.ts`)
   - Handles OAuth authentication flow
   - Manages access tokens with automatic refresh
   - Provides methods for fetching sensors, gateways, and samples
   - Respects API rate limits

2. **Platform Plugin** (`platform.ts`)
   - Implements Homebridge DynamicPlatformPlugin interface
   - Discovers and registers sensor accessories
   - Manages polling interval for sensor updates
   - Converts Fahrenheit to Celsius for HomeKit

3. **Sensor Accessory** (`platformAccessory.ts`)
   - Creates temperature and humidity sensor services
   - Optionally creates battery service for battery monitoring
   - Updates characteristic values when new data arrives

### API Integration
- **Base URL**: https://api.sensorpush.com/api/v1
- **Authentication**: OAuth 2.0 flow (simplified)
- **Rate Limit**: 1 request per minute
- **Token Expiry**: Access tokens valid for 12 hours

## Development

This is a Homebridge plugin that gets installed globally and runs within the Homebridge ecosystem. It's not a standalone application.

### Building
```bash
npm run build      # Compile TypeScript to JavaScript
npm run watch      # Auto-compile on file changes
npm run lint       # Run ESLint checks
```

### Testing Locally
To test this plugin with Homebridge:
1. Build the plugin: `npm run build`
2. Link it globally: `npm link`
3. Add configuration to Homebridge's `config.json`
4. Restart Homebridge

### Configuration Example
```json
{
  "platforms": [
    {
      "platform": "SensorPush",
      "name": "SensorPush",
      "email": "your-email@example.com",
      "password": "your-password",
      "pollingInterval": 60000
    }
  ]
}
```

## Dependencies

### Runtime
- `axios`: HTTP client for API requests
- `node-persist`: Token storage across restarts
- `homebridge`: Peer dependency (provided by Homebridge installation)

### Development
- `typescript`: TypeScript compiler
- `eslint`: Code linting
- `nodemon`: Auto-restart on changes

## Publishing

This plugin is designed to be published to npm and installed via:
- `npm install -g homebridge-sensorpush`
- Homebridge Config UI X plugin interface

Before publishing:
1. Update version in `package.json`
2. Update repository URL
3. Run `npm run lint && npm run build`
4. Test with local Homebridge installation
5. Publish: `npm publish`

## Notes
- Temperature values are converted from Fahrenheit (API) to Celsius (HomeKit)
- Plugin enforces minimum 60-second polling interval due to API rate limits
- Inactive sensors are automatically removed from HomeKit
- Authentication tokens are managed automatically with refresh before expiration
