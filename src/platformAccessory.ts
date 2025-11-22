import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SensorPushPlatform } from './platform';
import { Sensor } from './sensorPushApi';

export class SensorPushAccessory {
  private temperatureService: Service;
  private humidityService: Service;
  private batteryService?: Service;

  private currentTemperature: number = 0;
  private currentHumidity: number = 0;
  private batteryLevel: number = 100;
  private lowBattery: boolean = false;

  constructor(
    private readonly platform: SensorPushPlatform,
    private readonly accessory: PlatformAccessory,
    private sensor: Sensor,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SensorPush')
      .setCharacteristic(this.platform.Characteristic.Model, 'HT.w')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, sensor.id);

    this.temperatureService = this.accessory.getService(this.platform.Service.TemperatureSensor)
      || this.accessory.addService(this.platform.Service.TemperatureSensor);

    this.temperatureService.setCharacteristic(this.platform.Characteristic.Name, sensor.name);

    this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
      || this.accessory.addService(this.platform.Service.HumiditySensor);

    this.humidityService.setCharacteristic(this.platform.Characteristic.Name, sensor.name);

    this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getCurrentHumidity.bind(this));

    if (sensor.battery_voltage !== undefined) {
      this.batteryService = this.accessory.getService(this.platform.Service.Battery)
        || this.accessory.addService(this.platform.Service.Battery);

      this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel)
        .onGet(this.getBatteryLevel.bind(this));

      this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
        .onGet(this.getLowBatteryStatus.bind(this));
    }
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    return this.currentTemperature;
  }

  async getCurrentHumidity(): Promise<CharacteristicValue> {
    return this.currentHumidity;
  }

  async getBatteryLevel(): Promise<CharacteristicValue> {
    return this.batteryLevel;
  }

  async getLowBatteryStatus(): Promise<CharacteristicValue> {
    return this.lowBattery
      ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
  }

  updateValues(temperature: number, humidity: number, batteryVoltage?: number): void {
    this.currentTemperature = temperature;
    this.currentHumidity = humidity;

    this.temperatureService.updateCharacteristic(
      this.platform.Characteristic.CurrentTemperature,
      temperature,
    );

    this.humidityService.updateCharacteristic(
      this.platform.Characteristic.CurrentRelativeHumidity,
      humidity,
    );

    if (batteryVoltage !== undefined && this.batteryService) {
      const minVoltage = 2.0;
      const maxVoltage = 3.0;
      this.batteryLevel = Math.max(0, Math.min(100, 
        ((batteryVoltage - minVoltage) / (maxVoltage - minVoltage)) * 100));
      
      this.lowBattery = this.batteryLevel < 20;

      this.batteryService.updateCharacteristic(
        this.platform.Characteristic.BatteryLevel,
        this.batteryLevel,
      );

      this.batteryService.updateCharacteristic(
        this.platform.Characteristic.StatusLowBattery,
        this.lowBattery
          ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
          : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL,
      );
    }

    this.platform.log.debug(`Updated ${this.sensor.name}: ${temperature}°C, ${humidity}%`);
  }
}
