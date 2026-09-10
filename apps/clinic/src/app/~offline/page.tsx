const OfflinePage = () => (
  <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-3 px-6">
    <p className="text-sm font-medium text-primary">Offline</p>
    <h1 className="text-3xl font-semibold tracking-tight">
      The clinic is still available.
    </h1>
    <p className="text-muted-foreground">
      Reconnect to load pages that have not been saved on this device yet.
    </p>
  </main>
);

export default OfflinePage;
