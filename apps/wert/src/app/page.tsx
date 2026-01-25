import { SnapCarousel } from "@/components/dashboard/SnapCarousel";
import { SnapButton } from "@/components/snap-flow/SnapButton";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/app/actions/snapshot";
import { SettingsButton } from "@/components/settings/SettingsButton";

export default async function Home() {
  const data = await getDashboardData();

  if (!data) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <SnapCarousel data={data} />
      <SettingsButton />
      <SnapButton />
    </main>
  );
}
