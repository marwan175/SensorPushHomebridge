import axios, { AxiosInstance } from 'axios';
import { Logger } from 'homebridge';
import { API_BASE_URL } from './settings';

export interface SensorPushConfig {
  email: string;
  password: string;
}

export interface Sensor {
  id: string;
  name: string;
  deviceId: string;
  battery_voltage?: number;
  active?: boolean;
  alerts?: {
    humidity?: { enabled: boolean };
    temperature?: { enabled: boolean };
  };
}

export interface SensorData {
  temperature: number;
  humidity: number;
  observed: string;
}

export interface Gateway {
  id: string;
  name: string;
  last_seen?: string;
}

export class SensorPushApi {
  private client: AxiosInstance;
  private authorizationToken: string | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private log: Logger;

  constructor(
    private config: SensorPushConfig,
    log: Logger,
  ) {
    this.log = log;
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  async authenticate(): Promise<void> {
    try {
      this.log.debug('Authenticating with SensorPush API...');
      
      const authResponse = await this.client.post('/oauth/authorize', {
        email: this.config.email,
        password: this.config.password,
      });

      this.authorizationToken = authResponse.data.authorization;
      this.log.debug('Authorization successful');

      const tokenResponse = await this.client.post('/oauth/accesstoken', {
        authorization: this.authorizationToken,
      });

      this.accessToken = tokenResponse.data.accesstoken;
      this.tokenExpiresAt = Date.now() + (11 * 60 * 60 * 1000);
      this.log.info('Access token obtained successfully');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.log.error('Authentication failed:', error.response?.data || error.message);
      } else {
        this.log.error('Authentication failed:', error);
      }
      throw error;
    }
  }

  async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt - 60000) {
      this.log.debug('Token expired or missing, re-authenticating...');
      await this.authenticate();
    }
  }

  async getSensors(): Promise<Record<string, Sensor>> {
    await this.ensureAuthenticated();

    try {
      const response = await this.client.post('/devices/sensors', {}, {
        headers: {
          'Authorization': this.accessToken,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.log.error('Failed to get sensors:', error.response?.data || error.message);
      } else {
        this.log.error('Failed to get sensors:', error);
      }
      throw error;
    }
  }

  async getGateways(): Promise<Record<string, Gateway>> {
    await this.ensureAuthenticated();

    try {
      const response = await this.client.post('/devices/gateways', {}, {
        headers: {
          'Authorization': this.accessToken,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.log.error('Failed to get gateways:', error.response?.data || error.message);
      } else {
        this.log.error('Failed to get gateways:', error);
      }
      throw error;
    }
  }

  async getSamples(sensorIds?: string[], limit: number = 1): Promise<Record<string, Record<string, SensorData>>> {
    await this.ensureAuthenticated();

    try {
      const body: { limit: number; sensors?: string[] } = { limit };
      if (sensorIds && sensorIds.length > 0) {
        body.sensors = sensorIds;
      }

      const response = await this.client.post('/samples', body, {
        headers: {
          'Authorization': this.accessToken,
        },
      });

      return response.data.sensors || {};
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.log.error('Failed to get samples:', error.response?.data || error.message);
      } else {
        this.log.error('Failed to get samples:', error);
      }
      throw error;
    }
  }
}
