declare namespace chrome {
  namespace runtime {
    const onInstalled: { addListener(callback: () => void): void };
    const onMessage: { addListener(callback: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => void): void };
    function sendMessage(message: unknown): Promise<unknown>;
  }
  namespace storage { const local: { get(keys?: string | string[]): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> }; }
  namespace tabs {
    interface Tab { id?: number; }
    function query(queryInfo: Record<string, unknown>): Promise<Tab[]>;
    function sendMessage(tabId: number, message: unknown): Promise<unknown>;
  }
}
