import { capabilityNames, type AccountDefinition, type AccountRecord, type AccountState } from "@wato/core";

export class AccountRegistry {
  private readonly accounts = new Map<string, AccountRecord>();

  constructor(definitions: AccountDefinition[]) {
    for (const definition of definitions) {
      this.accounts.set(definition.id, {
        ...definition,
        state: definition.enabled ? "created" : "stopped"
      });
    }
  }

  list(): AccountRecord[] {
    return [...this.accounts.values()];
  }

  get(accountId: string): AccountRecord | undefined {
    return this.accounts.get(accountId);
  }

  updateState(accountId: string, state: AccountState): AccountRecord {
    return this.patch(accountId, { state });
  }

  setQrCode(accountId: string, qrCode?: string): AccountRecord {
    return this.patch(accountId, { qrCode });
  }

  setLastError(accountId: string, lastError?: string): AccountRecord {
    return this.patch(accountId, { lastError });
  }

  touch(accountId: string): AccountRecord {
    return this.patch(accountId, { lastSeenAt: new Date().toISOString() });
  }

  private patch(accountId: string, partial: Partial<AccountRecord>): AccountRecord {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Unknown account: ${accountId}`);
    }

    const updated = { ...account, ...partial };
    this.accounts.set(accountId, updated);
    return updated;
  }
}

export const accountRegistryCapability = capabilityNames.accountRegistry;
