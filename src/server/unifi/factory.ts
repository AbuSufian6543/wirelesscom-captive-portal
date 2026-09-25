import { MockUniFiProvider } from "./mock-provider";
import { RealUniFiProvider } from "./real-provider";
import type { UniFiConnection, UniFiProvider } from "./types";

export function createUniFiProvider(input: {
  mode: "MOCK" | "REAL";
  connection: UniFiConnection;
}): UniFiProvider {
  if (input.mode === "MOCK") return new MockUniFiProvider([{ id: "site", name: "Site", externalId: input.connection.siteExternalId }]);
  return new RealUniFiProvider(input.connection);
}
