import { SensorPushApi } from './sensorPushApi';

interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  success: (message: string, ...args: unknown[]) => void;
  log: (level: string, message: string, ...args: unknown[]) => void;
}

const logger: Logger = {
  debug: (message: string, ...args: unknown[]) => console.log(`[DEBUG] ${message}`, ...args),
  info: (message: string, ...args: unknown[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: unknown[]) => console.log(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: unknown[]) => console.log(`[ERROR] ${message}`, ...args),
  success: (message: string, ...args: unknown[]) => console.log(`[SUCCESS] ${message}`, ...args),
  log: (level: string, message: string, ...args: unknown[]) => console.log(`[${level.toUpperCase()}] ${message}`, ...args),
};

async function testSensorPushPlugin() {
  console.log('='.repeat(60));
  console.log('Testing Homebridge SensorPush Plugin');
  console.log('='.repeat(60));
  console.log();

  const email = process.env.SENSORPUSH_EMAIL;
  const password = process.env.SENSORPUSH_PASSWORD;

  if (!email || !password) {
    console.error('❌ ERROR: SENSORPUSH_EMAIL and SENSORPUSH_PASSWORD must be set');
    process.exit(1);
  }

  const api = new SensorPushApi({ email, password }, logger);

  try {
    console.log('📡 Step 1: Testing Authentication...');
    await api.authenticate();
    console.log('✅ Authentication successful!\n');

    console.log('🔍 Step 2: Discovering Sensors...');
    const sensors = await api.getSensors();
    const sensorIds = Object.keys(sensors);
    console.log(`✅ Found ${sensorIds.length} sensor(s)\n`);

    if (sensorIds.length === 0) {
      console.log('⚠️  No sensors found in your account.');
      console.log('   Make sure you have sensors registered in the SensorPush app.\n');
      return;
    }

    console.log('📊 Sensor Details:');
    console.log('-'.repeat(60));
    for (const sensorId of sensorIds) {
      const sensor = sensors[sensorId];
      console.log(`\n  Sensor: ${sensor.name}`);
      console.log(`  ID: ${sensorId}`);
      console.log(`  Active: ${sensor.active !== false ? 'Yes' : 'No'}`);
      if (sensor.battery_voltage !== undefined) {
        console.log(`  Battery: ${sensor.battery_voltage.toFixed(2)}V`);
      }
    }
    console.log('\n' + '-'.repeat(60));

    console.log('\n📈 Step 3: Fetching Latest Sensor Data...');
    const samples = await api.getSamples(sensorIds, 1);
    console.log('✅ Successfully retrieved sensor samples\n');

    console.log('🌡️  Latest Readings:');
    console.log('-'.repeat(60));
    for (const sensorId of sensorIds) {
      const sensorData = samples[sensorId];
      const sensor = sensors[sensorId];
      
      if (sensorData) {
        const latestTimestamp = Object.keys(sensorData).sort().reverse()[0];
        const latestSample = sensorData[latestTimestamp];

        if (latestSample) {
          const tempF = latestSample.temperature;
          const tempC = ((tempF - 32) * 5 / 9).toFixed(1);
          const humidity = latestSample.humidity.toFixed(1);
          const date = new Date(latestTimestamp);

          console.log(`\n  ${sensor.name}:`);
          console.log(`    Temperature: ${tempF}°F (${tempC}°C)`);
          console.log(`    Humidity: ${humidity}%`);
          console.log(`    Last Updated: ${date.toLocaleString()}`);
        }
      } else {
        console.log(`\n  ${sensor.name}: No data available`);
      }
    }
    console.log('\n' + '-'.repeat(60));

    console.log('\n🔍 Step 4: Testing Gateway Discovery...');
    const gateways = await api.getGateways();
    const gatewayIds = Object.keys(gateways);
    console.log(`✅ Found ${gatewayIds.length} gateway(s)\n`);

    if (gatewayIds.length > 0) {
      console.log('📡 Gateway Details:');
      console.log('-'.repeat(60));
      for (const gatewayId of gatewayIds) {
        const gateway = gateways[gatewayId];
        const lastSeen = gateway.last_seen ? new Date(gateway.last_seen).toLocaleString() : 'Never';
        console.log(`\n  Gateway: ${gateway.name}`);
        console.log(`  ID: ${gatewayId}`);
        console.log(`  Last Seen: ${lastSeen}`);
      }
      console.log('\n' + '-'.repeat(60));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\nYour SensorPush plugin is working correctly!');
    console.log('You can now use this plugin with Homebridge.\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

testSensorPushPlugin();
