import type { UserId } from '../../../domain/shared/user-id';
import type { WearableConnectionId } from './wearable-connection-id';
import type { WearableProvider } from './wearable-provider';

export interface WearableConnectionData {
  readonly id: WearableConnectionId;
  readonly clientUserId: UserId;
  readonly provider: WearableProvider;
  readonly authRef: Record<string, unknown> | null;
  readonly lastSyncedAt: Date | null;
  readonly active: boolean;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateWearableConnectionProps {
  readonly id: WearableConnectionId;
  readonly clientUserId: UserId;
  readonly provider: WearableProvider;
  readonly authRef: Record<string, unknown> | null;
  readonly now: Date;
}

export class WearableConnection {
  private constructor(private data: WearableConnectionData) {}

  static create(props: CreateWearableConnectionProps): WearableConnection {
    return new WearableConnection({
      id: props.id,
      clientUserId: props.clientUserId,
      provider: props.provider,
      authRef: props.authRef,
      lastSyncedAt: null,
      active: true,
      deletedAt: null,
      createdAt: props.now,
      updatedAt: props.now,
    });
  }

  static reconstitute(data: WearableConnectionData): WearableConnection {
    return new WearableConnection(data);
  }

  get id(): WearableConnectionId {
    return this.data.id;
  }

  get clientUserId(): UserId {
    return this.data.clientUserId;
  }

  get provider(): WearableProvider {
    return this.data.provider;
  }

  get authRef(): Record<string, unknown> | null {
    return this.data.authRef;
  }

  get lastSyncedAt(): Date | null {
    return this.data.lastSyncedAt;
  }

  get active(): boolean {
    return this.data.active;
  }

  get deletedAt(): Date | null {
    return this.data.deletedAt;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  get isDeleted(): boolean {
    return this.data.deletedAt !== null;
  }

  disconnect(now: Date): void {
    if (this.isDeleted) {
      return;
    }
    this.data = {
      ...this.data,
      active: false,
      deletedAt: now,
      updatedAt: now,
    };
  }

  recordSync(now: Date): void {
    if (this.isDeleted || !this.data.active) {
      throw new Error('Cannot sync on inactive or deleted wearable connection');
    }
    this.data = {
      ...this.data,
      lastSyncedAt: now,
      updatedAt: now,
    };
  }
}
