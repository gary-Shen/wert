'use client'

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/ark/popover"
import { motion } from "framer-motion"
import { Plus, Camera, Wallet } from "lucide-react"
import { useState } from "react"
import { SnapWizard } from "./SnapWizard"
import { CreateAssetDialog } from "./CreateAssetDialog"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
  highlighted?: boolean
}

function MenuItem({ icon, label, description, onClick, highlighted }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 w-full p-3 rounded-lg text-left transition-all",
        "hover:bg-accent hover:scale-[1.02]",
        highlighted && "bg-primary/10",
        "focus-visible:outline-none focus-visible:ring-0"
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
        highlighted ? "bg-accent text-white" : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn(
          "font-medium text-foreground",
          highlighted && "font-semibold"
        )}>
          {label}
        </div>
        <div className="text-sm text-muted-foreground">
          {description}
        </div>
      </div>
    </button>
  )
}

export function SnapButton() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false)
  const router = useRouter()

  const handleCreateSnapshot = () => {
    setIsPopoverOpen(false)
    setIsWizardOpen(true)
  }

  const handleCreateAsset = () => {
    setIsPopoverOpen(false)
    setIsAssetDialogOpen(true)
  }

  const handleAssetCreated = () => {
    // 刷新页面数据
    router.refresh()
  }

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        <Popover open={isPopoverOpen} data-side="top-left" onOpenChange={(e) => setIsPopoverOpen(e.open)} positioning={{ placement: 'top-end', gutter: 12 }}>
          <PopoverTrigger asChild>
            <motion.div
              className={cn(
                "p-[1px] rounded-full cursor-pointer",
                "bg-[linear-gradient(135deg,var(--gradient-from),var(--gradient-to))]",
                "shadow-lg"
              )}
              whileHover={{ scale: 1.5 }}
              whileTap={{ scale: 0.7 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center",
                "bg-primary text-white",
                "hover:bg-primary/90 transition-colors duration-200"
              )}>
                <Plus className={cn("h-8 w-8 transition-transform duration-200", isPopoverOpen && "rotate-45")} />
              </div>
            </motion.div>
          </PopoverTrigger>
          <PopoverContent
            className="p-2 rounded-xl shadow-2xl border-border/50"
          >
            <div className="space-y-1">
              <MenuItem
                icon={<Camera className="h-5 w-5" />}
                label="创建快照"
                description="记录当前资产状态"
                onClick={handleCreateSnapshot}
                highlighted
              />
              <MenuItem
                icon={<Wallet className="h-5 w-5" />}
                label="创建资产"
                description="添加新的资产账户"
                onClick={handleCreateAsset}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <SnapWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
      />

      <CreateAssetDialog
        open={isAssetDialogOpen}
        onOpenChange={setIsAssetDialogOpen}
        onSuccess={handleAssetCreated}
      />
    </>
  )
}
