/**
 * SUCHAK Cloud Object Storage Types & Abstractions
 * Provider-agnostic storage interface supporting local filesystem, AWS S3, Google Cloud Storage, and Azure Blob.
 */

export type StorageProviderType = 'LOCAL_FILESYSTEM' | 'AWS_S3' | 'GOOGLE_CLOUD_STORAGE' | 'AZURE_BLOB';

export interface StorageObjectMetadata {
  objectId: string;
  tenantId: string;
  resourceType: 'report_attachment' | 'audit_export' | 'evaluation_dump' | 'vector_snapshot' | 'backup_archive';
  resourceId: string;
  originalFileName: string;
  sanitizedFileName: string;
  contentType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedByUserId: string;
  uploadedAt: string;
  isPrivate: boolean;
  sha256Checksum?: string;
  encryptionAlgorithm: 'AES-256-GCM' | 'PROVIDER_MANAGED_SSE' | 'NONE';
  lifecyclePolicy?: 'retain_indefinite' | 'delete_after_90_days' | 'archive_after_365_days';
}

export interface StorageStatus {
  provider: StorageProviderType;
  bucketOrBasePath: string;
  status: 'ONLINE' | 'DEGRADED' | 'STANDBY';
  totalObjects: number;
  totalSizeBytes: number;
  encryptionEnforced: boolean;
  presignedUrlsSupported: boolean;
  maxUploadSizeBytes: number;
  allowedMimeTypes: string[];
  lastHealthCheck: string;
}

export interface SignedUrlRequest {
  tenantId: string;
  resourceType: StorageObjectMetadata['resourceType'];
  resourceId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  expiresInSeconds?: number;
}

export interface SignedUrlResponse {
  objectId: string;
  uploadUrl: string;
  downloadUrl: string;
  expiresAt: string;
  storagePath: string;
  headers: Record<string, string>;
}
