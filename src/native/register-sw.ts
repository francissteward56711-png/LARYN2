// The iOS app bundles its screens and receives updates as an IPA, not a service worker.
export function useRegisterSW(_options?: unknown) {
  return {
    offlineReady: [false, (_value: boolean) => {}] as const,
    needRefresh: [false, (_value: boolean) => {}] as const,
    updateServiceWorker: async (_reload?: boolean) => {},
  }
}
