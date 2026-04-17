import { TopAppBar } from "@/components/mobile/TopAppBar";
import { BottomTabBar } from "@/components/mobile/BottomTabBar";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopAppBar title="BlockSense" />
      <main className="flex-1 pt-14 pb-16 px-0 overflow-y-auto">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
