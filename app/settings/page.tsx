import { getAssets } from "@/lib/actions/assets";
import { AssetManagement } from "@/components/settings/AssetManagement";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "设置 | SnapWorth",
};

export default async function SettingsPage() {
  const assets = await getAssets();

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground">
          管理您的资产和配置。
        </p>
      </div>

      <AssetManagement initialAssets={assets} />

      {/* Danger Zone could go here */}
    </div>
  );
}
