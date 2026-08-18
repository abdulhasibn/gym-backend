import type { Database, Json } from '../../../infrastructure/supabase/database.types';
import { WearableConnection } from '../domain/wearable-connection.entity';
import type { WearableConnectionSummary } from '../domain/wearable-connection.queries';
import { toWearableConnectionId } from '../domain/wearable-connection-id';
import { WearableProvider } from '../domain/wearable-provider';
import { toUserId } from '../../../domain/shared/user-id';

type WearableConnectionRow = Database['public']['Tables']['wearable_connections']['Row'];
type WearableDailyMetricRow = Database['public']['Tables']['wearable_daily_metrics']['Row'];

export function toWearableConnection(row: WearableConnectionRow): WearableConnection {
  return WearableConnection.reconstitute({
    id: toWearableConnectionId(row.id),
    clientUserId: toUserId(row.client_user_id),
    provider: WearableProvider.reconstitute(row.provider),
    authRef: row.auth_ref as Record<string, unknown> | null,
    lastSyncedAt: row.last_synced_at === null ? null : new Date(row.last_synced_at),
    active: row.active,
    deletedAt: row.deleted_at === null ? null : new Date(row.deleted_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

export function toWearableConnectionInsert(
  connection: WearableConnection,
): Database['public']['Tables']['wearable_connections']['Insert'] {
  return {
    id: connection.id,
    client_user_id: connection.clientUserId,
    provider: connection.provider.code,
    auth_ref: connection.authRef as Json | null,
    last_synced_at: connection.lastSyncedAt?.toISOString() ?? null,
    active: connection.active,
    deleted_at: connection.deletedAt?.toISOString() ?? null,
    created_at: connection.createdAt.toISOString(),
    updated_at: connection.updatedAt.toISOString(),
  };
}

export function toWearableConnectionUpdate(
  connection: WearableConnection,
): Database['public']['Tables']['wearable_connections']['Update'] {
  return {
    auth_ref: connection.authRef as Json | null,
    last_synced_at: connection.lastSyncedAt?.toISOString() ?? null,
    active: connection.active,
    deleted_at: connection.deletedAt?.toISOString() ?? null,
    updated_at: connection.updatedAt.toISOString(),
  };
}

export function toWearableConnectionSummary(row: WearableConnectionRow): WearableConnectionSummary {
  return {
    id: row.id,
    provider: row.provider,
    lastSyncedAt: row.last_synced_at,
    active: row.active,
    createdAt: row.created_at,
  };
}

export function toWearableDailyMetricSummary(row: WearableDailyMetricRow) {
  return {
    id: row.id,
    provider: row.provider,
    metricOn: row.metric_on,
    steps: row.steps,
    activeKcal: row.active_kcal === null ? null : Number(row.active_kcal),
    workoutMinutes: row.workout_minutes,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    ingestedAt: row.ingested_at,
  };
}
