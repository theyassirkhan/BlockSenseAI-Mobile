import { TopAppBar } from "@/components/mobile/TopAppBar";
import { BottomTabBar } from "@/components/mobile/BottomTabBar";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <TopAppBar title="BlockSense" />
      <main
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: "calc(56px + env(safe-area-inset-top))",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
