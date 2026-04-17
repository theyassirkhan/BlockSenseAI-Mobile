export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0F6E56] text-white text-2xl font-bold shadow-lg">
        BS
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">You&apos;re offline</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
          BlockSense needs a connection to fetch the latest data. Your cached data will load as soon as you&apos;re back online.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl bg-[#0F6E56] text-white font-semibold active:scale-95 transition-transform min-h-[44px]"
      >
        Retry
      </button>
    </div>
  );
}
