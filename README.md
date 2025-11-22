# Homebridge SensorPush

A Homebridge plugin that integrates SensorPush temperature and humidity sensors with Apple HomeKit.

## Features

- **Automatic Discovery**: Automatically discovers all SensorPush sensors registered to your account
- **Temperature & Humidity**: Exposes temperature and humidity readings as HomeKit sensors
- **Battery Monitoring**: Shows battery level and low battery warnings for your sensors
- **Auto-Refresh**: Automatically polls for new sensor data while respecting API rate limits
- **Token Management**: Handles OAuth authentication and automatic token refresh

## Prerequisites

- [Homebridge](https://homebridge.io/) v1.6.0 or higher
- A SensorPush Gateway and one or more SensorPush sensors
- An active SensorPush account with Gateway Cloud API access

## Installation

### Via Homebridge Config UI X (Recommended)

1. Search for "SensorPush" in the Homebridge Config UI X plugin search
2. Install the `homebridge-sensorpush` plugin
3. Configure your SensorPush account credentials
4. Restart Homebridge

### Via npm

```bash
npm install -g homebridge-sensorpush
```

## Configuration

Add the platform to your Homebridge `config.json`:

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

### Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `platform` | Yes | - | Must be `"SensorPush"` |
| `name` | Yes | - | Name for the platform (e.g., "SensorPush") |
| `email` | Yes | - | Your SensorPush account email |
| `password` | Yes | - | Your SensorPush account password |
| `pollingInterval` | No | `60000` | How often to poll for data in milliseconds (minimum 60000) |

## API Activation

Before using this plugin, you must activate API access for your SensorPush account:

1. Log in to the [SensorPush Gateway Cloud Dashboard](https://dashboard.sensorpush.com/)
2. Accept the API terms of service
3. Your account will now have API access

For more information, see the [SensorPush Gateway Cloud API](https://www.sensorpush.com/gateway-cloud-api) documentation.

## How It Works

1. The plugin authenticates with the SensorPush Gateway Cloud API using your credentials
2. It discovers all active sensors registered to your account
3. Each sensor is registered as a HomeKit accessory with:
   - Temperature Sensor service
   - Humidity Sensor service
   - Battery service (if battery data is available)
4. The plugin polls the API at the configured interval (default: 60 seconds) to update sensor readings
5. Authentication tokens are automatically refreshed before expiration

## Rate Limiting

The SensorPush API has a rate limit of **1 request per minute**. This plugin respects this limit by:
- Enforcing a minimum polling interval of 60 seconds
- Batching all sensor updates into a single API call

## Temperature Units

- The SensorPush API returns temperatures in **Fahrenheit**
- This plugin automatically converts temperatures to **Celsius** for HomeKit compatibility
- Your Home app will display temperatures in your preferred unit based on your device settings

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/USERNAME/homebridge-sensorpush.git
cd homebridge-sensorpush

# Install dependencies
npm install

# Build the plugin
npm run build

# Link for development
npm link

# Watch for changes
npm run watch
```

### Project Structure

```
src/
├── index.ts              # Plugin entry point
├── platform.ts           # Main platform implementation
├── platformAccessory.ts  # Sensor accessory implementation
├── sensorPushApi.ts      # SensorPush API client
└── settings.ts           # Constants and configuration
```

## Troubleshooting

### "Authentication failed" errors

- Verify your email and password are correct
- Ensure you've logged into the Gateway Cloud Dashboard at least once to accept the API terms

### Sensors not appearing

- Check that your sensors are active in the SensorPush mobile app
- Verify your gateway is online and connected to the cloud
- Check Homebridge logs for any error messages

### Stale readings

- Ensure your gateway has been seen recently (check in the SensorPush app)
- Gateways relay sensor data approximately every minute
- Consider increasing the polling interval if you're hitting rate limits

## Support

For issues and questions:
- Check the [Homebridge Discord](https://discord.gg/homebridge)
- Open an issue on [GitHub](https://github.com/USERNAME/homebridge-sensorpush/issues)

## License

Apache-2.0

## Credits

- Built using the [Homebridge Plugin Template](https://github.com/homebridge/homebridge-plugin-template)
- Integrates with the [SensorPush Gateway Cloud API](https://www.sensorpush.com/gateway-cloud-api)
