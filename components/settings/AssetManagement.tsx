'use client'

import { createAsset, deleteAsset } from "@/lib/actions/assets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

export function AssetManagement({ initialAssets }: { initialAssets: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: "",
    type: "CASH",
    currency: "CNY",
    purchasePrice: "",
    purchaseDate: "",
    lifespanMonths: "",
    initialLoan: "",
    monthlyPayment: "",
    repaymentDate: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      let metadata: any = {};
      let category = formData.type;

      // Map UI types to Schema Enums: CASH, STOCK, REAL_ESTATE, LIABILITY
      // Map UI types to Schema Enums
      if (formData.type === "FIXED") category = "REAL_ESTATE";
      // STOCK, FUND, BOND, CASH, CRYPTO map directly
      if (formData.type === "VEHICLE") category = "VEHICLE";
      if (formData.type === "METAL") category = "PRECIOUS_METAL";
      if (formData.type === "COLLECT") category = "COLLECTIBLE";


      if (category === "REAL_ESTATE" && formData.purchasePrice) {
        metadata = {
          purchasePrice: parseFloat(formData.purchasePrice),
          purchaseDate: formData.purchaseDate,
          lifespanMonths: parseInt(formData.lifespanMonths) || 120
        };
      } else if (category === "LIABILITY" && formData.initialLoan) {
        metadata = {
          initialLoan: parseFloat(formData.initialLoan),
          monthlyPayment: parseFloat(formData.monthlyPayment),
          repaymentDate: formData.repaymentDate
        };
      }

      await createAsset({
        name: formData.name,
        type: category as any,
        currency: formData.currency,
        metadata
      });
      setIsOpen(false);

      setFormData({
        name: "",
        type: "CASH",
        currency: "CNY",
        purchasePrice: "",
        purchaseDate: "",
        lifespanMonths: "",
        initialLoan: "",
        monthlyPayment: "",
        repaymentDate: ""
      });
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("确认永久删除？")) return;
    startTransition(async () => {
      await deleteAsset(id);
    });
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>资产列表</CardTitle>
          <CardDescription>管理您的资产。</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> 新增资产</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>添加资产</DialogTitle>
                <DialogDescription>
                  创建一个新的资产或负债跟踪项。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">类型</Label>
                  <Select onValueChange={v => setFormData({ ...formData, type: v })} defaultValue={formData.type}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">现金 (低风险 · 存款/货基)</SelectItem>
                      <SelectItem value="STOCK">股票 (高风险 · 个股)</SelectItem>
                      <SelectItem value="FUND">基金 (中高风险 · 偏股/混合)</SelectItem>
                      <SelectItem value="BOND">债券 (低风险 · 债券/债基)</SelectItem>
                      <SelectItem value="CRYPTO">加密货币 (高风险)</SelectItem>
                      <SelectItem value="FIXED">房产 (不动产)</SelectItem>
                      <SelectItem value="VEHICLE">交通工具 (消费品)</SelectItem>
                      <SelectItem value="METAL">贵金属 (保值)</SelectItem>
                      <SelectItem value="COLLECT">收藏品 (另类投资)</SelectItem>
                      <SelectItem value="LIABILITY">负债 (贷款)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="currency" className="text-right">货币</Label>
                  <Select onValueChange={v => setFormData({ ...formData, currency: v })} defaultValue={formData.currency}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="选择货币" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNY">CNY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="HKD">HKD</SelectItem>
                      <SelectItem value="JPY">JPY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === "FIXED" && (
                  <>
                    <div className="border-t my-2 pt-2 col-span-4 text-xs font-bold text-muted-foreground">自动化配置</div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">价格</Label>
                      <Input type="number" value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })} className="col-span-3" placeholder="原价" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">日期</Label>
                      <Input type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">寿命 (月)</Label>
                      <Input type="number" value={formData.lifespanMonths} onChange={e => setFormData({ ...formData, lifespanMonths: e.target.value })} className="col-span-3" placeholder="120" />
                    </div>
                  </>
                )}
                {formData.type === "LIABILITY" && (
                  <>
                    <div className="border-t my-2 pt-2 col-span-4 text-xs font-bold text-muted-foreground">自动化配置</div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">贷款</Label>
                      <Input type="number" value={formData.initialLoan} onChange={e => setFormData({ ...formData, initialLoan: e.target.value })} className="col-span-3" placeholder="初始本金" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">还款</Label>
                      <Input type="number" value={formData.monthlyPayment} onChange={e => setFormData({ ...formData, monthlyPayment: e.target.value })} className="col-span-3" placeholder="月供" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">开始日期</Label>
                      <Input type="date" value={formData.repaymentDate} onChange={e => setFormData({ ...formData, repaymentDate: e.target.value })} className="col-span-3" />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>{isPending ? "保存中..." : "保存资产"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {initialAssets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
              <div className="flex flex-col">
                <span className="font-medium">{asset.name}</span>
                <span className="text-xs text-muted-foreground">{asset.category} • {asset.currency} • {asset.isArchived ? "已归档" : "活跃"}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id)} disabled={isPending}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {initialAssets.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              暂无资产。
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
