'use client'

import { createAsset, searchAssetSymbols } from "@/app/actions/assets";
import { AutoCompleteInput, type AutoCompleteItem } from "@/components/ui/ark/autocomplete";
import { Button } from "@/components/ui/ark/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/ark/sheet";
import { Input } from "@/components/ui/ark/input";
import { Label } from "@/components/ui/ark/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, createListCollection } from "@/components/ui/ark/select";
import { Loader2 } from "lucide-react";
import React, { useState, useTransition, useCallback } from "react";

interface CreateAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateAssetDialog({ open, onOpenChange, onSuccess }: CreateAssetDialogProps) {
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: "",
    type: "CASH",
    currency: "CNY",
    symbol: "",
    market: "",
    quantity: "",
    purchasePrice: "",
    purchaseDate: "",
    lifespanMonths: "",
    initialLoan: "",
    monthlyPayment: "",
    repaymentDate: ""
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "CASH",
      currency: "CNY",
      symbol: "",
      market: "",
      quantity: "",
      purchasePrice: "",
      purchaseDate: "",
      lifespanMonths: "",
      initialLoan: "",
      monthlyPayment: "",
      repaymentDate: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      let metadata: Record<string, unknown> = {};
      let category = formData.type;

      if (formData.type === "FIXED") category = "REAL_ESTATE";
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
        type: category as Parameters<typeof createAsset>[0]['type'],
        currency: formData.currency,
        symbol: formData.symbol,
        market: formData.market,
        quantity: formData.quantity,
        metadata
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    });
  };

  const symbolFetcher = useCallback(async (query: string): Promise<AutoCompleteItem[]> => {
    const results = await searchAssetSymbols(query);
    return results.map(r => ({
      value: r.symbol,
      label: `${r.cnName} (${r.symbol})`,
      subLabel: r.name ?? undefined,
      data: r
    }));
  }, []);

  const handleSymbolSelect = (item: AutoCompleteItem) => {
    const data = item.data as { symbol: string; cnName: string };
    setFormData(prev => ({
      ...prev,
      symbol: data.symbol,
      name: prev.name || data.cnName
    }));
  };

  const assetTypeCollection = React.useMemo(() => createListCollection({
    items: [
      { value: "CASH", label: "现金 (低风险 · 存款/货基)" },
      { value: "STOCK", label: "股票 (高风险 · 个股)" },
      { value: "FUND", label: "基金 (中高风险 · 偏股/混合)" },
      { value: "BOND", label: "债券 (低风险 · 债券/债基)" },
      { value: "CRYPTO", label: "加密货币 (高风险)" },
      { value: "FIXED", label: "房产 (不动产)" },
      { value: "VEHICLE", label: "交通工具 (消费品)" },
      { value: "METAL", label: "贵金属 (保值)" },
      { value: "COLLECT", label: "收藏品 (另类投资)" },
      { value: "LIABILITY", label: "负债 (贷款)" },
    ]
  }), [])

  const currencyCollection = React.useMemo(() => createListCollection({
    items: [
      { value: "CNY", label: "CNY" },
      { value: "USD", label: "USD" },
      { value: "HKD", label: "HKD" },
      { value: "JPY", label: "JPY" },
    ]
  }), [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>添加资产</SheetTitle>
            <SheetDescription>
              创建一个新的资产或负债跟踪项。
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 py-4 px-6">
            <div className="grid gap-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                autoComplete="off"
                placeholder="例如: 招商银行储蓄卡"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">类型</Label>
              <Select
                value={[formData.type]}
                onValueChange={(e) => setFormData({ ...formData, type: e.value[0] })}
                collection={assetTypeCollection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypeCollection.items.map((item) => (
                    <SelectItem key={item.value} item={item}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency">货币</Label>
              <Select
                value={[formData.currency]}
                onValueChange={(e) => setFormData({ ...formData, currency: e.value[0] })}
                collection={currencyCollection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择货币" />
                </SelectTrigger>
                <SelectContent>
                  {currencyCollection.items.map((item) => (
                    <SelectItem key={item.value} item={item}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {["STOCK", "FUND", "BOND", "CRYPTO"].includes(formData.type) && (
              <>
                <div className="border-t my-2 pt-2 text-xs font-bold text-muted-foreground">投资详情 (自动估值)</div>
                <div className="grid gap-2">
                  <Label>代码</Label>
                  <AutoCompleteInput
                    value={formData.symbol}
                    onValueChange={v => setFormData({ ...formData, symbol: v })}
                    onSelect={handleSymbolSelect}
                    fetcher={symbolFetcher}
                    placeholder="搜索代码/名称 (支持自由输入)"
                    emptyText="未找到相关资产"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>市场</Label>
                  <Input value={formData.market} onChange={e => setFormData({ ...formData, market: e.target.value })} placeholder="可选 (US, HK, CN)" />
                </div>
                <div className="grid gap-2">
                  <Label>数量</Label>
                  <Input type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} placeholder="持仓份额" />
                </div>
              </>
            )}

            {formData.type === "FIXED" && (
              <>
                <div className="border-t my-2 pt-2 text-xs font-bold text-muted-foreground">自动化配置</div>
                <div className="grid gap-2">
                  <Label>价格</Label>
                  <Input type="number" value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })} placeholder="原价" />
                </div>
                <div className="grid gap-2">
                  <Label>日期</Label>
                  <Input type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>寿命 (月)</Label>
                  <Input type="number" value={formData.lifespanMonths} onChange={e => setFormData({ ...formData, lifespanMonths: e.target.value })} placeholder="120" />
                </div>
              </>
            )}

            {formData.type === "LIABILITY" && (
              <>
                <div className="border-t my-2 pt-2 text-xs font-bold text-muted-foreground">自动化配置</div>
                <div className="grid gap-2">
                  <Label>贷款</Label>
                  <Input type="number" value={formData.initialLoan} onChange={e => setFormData({ ...formData, initialLoan: e.target.value })} placeholder="初始本金" />
                </div>
                <div className="grid gap-2">
                  <Label>还款</Label>
                  <Input type="number" value={formData.monthlyPayment} onChange={e => setFormData({ ...formData, monthlyPayment: e.target.value })} placeholder="月供" />
                </div>
                <div className="grid gap-2">
                  <Label>开始日期</Label>
                  <Input type="date" value={formData.repaymentDate} onChange={e => setFormData({ ...formData, repaymentDate: e.target.value })} />
                </div>
              </>
            )}
          </div>

          <SheetFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存资产
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
