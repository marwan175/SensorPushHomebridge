import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME, DEFAULT_POLLING_INTERVAL } from './settings';
import { SensorPushApi, SensorPushConfig, Sensor } from './sensorPushApi';
import { SensorPushAccessory } from './platformAccessory';

export class SensorPushPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  private readonly sensorAccessories: Map<string, SensorPushAccessory> = new Map();
  private api_client!: SensorPushApi;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private updateInterval!: number;
  private sensorMetadataCache: Record<string, Sensor> = {};
  private pollingCycleCount: number = 0;
  private readonly METADATA_REFRESH_CYCLES = 10;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    this.log.debug('Initializing platform:', this.config.name);

    if (!this.config.email || !this.config.password) {
      this.log.error('SensorPush email and password must be configured');
      return;
    }

    const apiConfig: SensorPushConfig = {
      email: this.config.email as string,
      password: this.config.password as string,
    };

    this.api_client = new SensorPushApi(apiConfig, this.log);
    this.updateInterval = (this.config.pollingInterval as number || DEFAULT_POLLING_INTERVAL);

    if (this.updateInterval < 60000) {
      this.log.warn('Polling interval is less than 60 seconds. API has a rate limit of 1 request per minute.');
      this.updateInterval = 60000;
    }

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    try {
      this.log.info('Discovering SensorPush devices...');

      await this.api_client.authenticate();

      const sensors = await this.api_client.getSensors();
      this.sensorMetadataCache = sensors;
      
      const sensorIds = Object.keys(sensors);

      this.log.info(`Found ${sensorIds.length} sensor(s)`);

      const validSensors: Sensor[] = [];
      for (const sensorId of sensorIds) {
        const sensor = sensors[sensorId];
        if (sensor.active !== false) {
          validSensors.push({ ...sensor, id: sensorId });
        }
      }

      for (const sensor of validSensors) {
        const uuid = this.api.hap.uuid.generate(sensor.id);
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          existingAccessory.context.sensor = sensor;
          this.api.updatePlatformAccessories([existingAccessory]);

          const accessoryInstance = new SensorPushAccessory(this, existingAccessory, sensor);
          this.sensorAccessories.set(sensor.id, accessoryInstance);
        } else {
          this.log.info('Adding new accessory:', sensor.name);
          const accessory = new this.api.platformAccessory(sensor.name, uuid);
          accessory.context.sensor = sensor;

          const accessoryInstance = new SensorPushAccessory(this, accessory, sensor);
          this.sensorAccessories.set(sensor.id, accessoryInstance);

          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          this.accessories.push(accessory);
        }
      }

      const activeSensorIds = validSensors.map(s => s.id);
      const accessoriesToRemove = this.accessories.filter(accessory => {
        const sensorId = accessory.context.sensor?.id;
        return sensorId && !activeSensorIds.includes(sensorId);
      });

      if (accessoriesToRemove.length > 0) {
        this.log.info(`Removing ${accessoriesToRemove.length} inactive accessory(ies)`);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRemove);
      }

      this.startPolling();

    } catch (error) {
      this.log.error('Failed to discover devices:', error);
    }
  }

  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingCycleCount = 0;

    this.pollingInterval = setInterval(() => {
      this.poll();
    }, this.updateInterval);

    this.log.info(`Started polling every ${this.updateInterval / 1000} seconds`);
    this.log.info(`Metadata refresh every ${this.METADATA_REFRESH_CYCLES} cycles (~${this.METADATA_REFRESH_CYCLES} minutes)`);
  }

  async poll() {
    this.pollingCycleCount++;

    if (this.pollingCycleCount % this.METADATA_REFRESH_CYCLES === 0) {
      this.log.debug(`Cycle ${this.pollingCycleCount}: refreshing metadata`);
      await this.refreshMetadata();
    } else {
      this.log.debug(`Cycle ${this.pollingCycleCount}: updating sensor data`);
      await this.updateSensorData();
    }
  }

  async refreshMetadata() {
    try {
      this.log.debug('Refreshing sensor metadata cache');
      this.sensorMetadataCache = await this.api_client.getSensors();
    } catch (error) {
      this.log.error('Failed to refresh sensor metadata:', error);
    }
  }

  async updateSensorData() {
    try {
      const sensorIds = Array.from(this.sensorAccessories.keys());
      
      if (sensorIds.length === 0) {
        return;
      }

      const samples = await this.api_client.getSamples(sensorIds, 1);

      for (const [sensorId, accessory] of this.sensorAccessories.entries()) {
        const sensorData = samples[sensorId];
        
        if (sensorData) {
          const latestTimestamp = Object.keys(sensorData).sort().reverse()[0];
          const latestSample = sensorData[latestTimestamp];

          if (latestSample) {
            const tempCelsius = (latestSample.temperature - 32) * 5 / 9;
            const humidity = latestSample.humidity;

            const sensorInfo = this.sensorMetadataCache[sensorId];
            const batteryVoltage = sensorInfo?.battery_voltage;

            accessory.updateValues(tempCelsius, humidity, batteryVoltage);
          }
        }
      }

    } catch (error) {
      this.log.error('Failed to update sensor data:', error);
    }
  }
}
