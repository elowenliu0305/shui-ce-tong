import type { MockEnvelope } from "../mock/mock-database";

export interface AppSnapshotSource {
  readonly readyInitially: boolean;
  initial(): Readonly<MockEnvelope>;
  read(): Promise<Readonly<MockEnvelope>>;
}
