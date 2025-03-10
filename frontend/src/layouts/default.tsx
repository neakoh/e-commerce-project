import { VerticalNav } from "@/components/VerticalNav";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col md:flex-row h-[100dvh] w-[100dvw] overflow-hidden">
      <VerticalNav />
      <main className="flex-grow overflow-auto pt-[72px] md:pt-0">
        <div className="h-full w-full">
          {children}
        </div>
      </main>
    </div>
  );
}