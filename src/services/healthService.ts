/**
 * Health Service for checking backend readiness
 */
import { apiClient } from './apiClient.ts';
import { HealthCheckResponse } from '../types/index.ts';

export interface DbHealthResponse {
  status: string;
  connected: boolean;
  engine: string;
  database?: string;
}

export const healthService = {
  async checkRootHealth(): Promise<{ status: string }> {
    return apiClient<{ status: string }>('/health');
  },

  async checkApiV1Health(): Promise<HealthCheckResponse> {
    return apiClient<HealthCheckResponse>('/api/v1/health');
  },

  async checkDbHealth(): Promise<DbHealthResponse> {
    return apiClient<DbHealthResponse>('/api/v1/health/db');
  },
};
