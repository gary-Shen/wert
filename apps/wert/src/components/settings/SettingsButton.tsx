'use client'

import { Button } from "@/components/ui/ark/button"
import { Popover, PopoverTrigger } from "@/components/ui/ark/popover"
import { Settings } from "lucide-react"
import { useState } from "react"
import { SettingsPopover } from "./SettingsPopover"

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="hidden md:block fixed top-6 right-6 z-50">
      <Popover open={isOpen} onOpenChange={(e) => setIsOpen(e.open)} positioning={{ placement: "bottom-end", gutter: 8 }}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-full shadow-lg bg-background/80 backdrop-blur-sm hover:scale-105 transition-transform border-muted-foreground/20"
          >
            <Settings className="h-5 w-5 text-foreground" />
          </Button>
        </PopoverTrigger>
        <SettingsPopover onClose={() => setIsOpen(false)} />
      </Popover>
    </div>
  )
}
