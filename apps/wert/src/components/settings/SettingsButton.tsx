'use client'

import { Button } from "@/components/ui/button"
import { HandCoins } from "lucide-react"
import { useState } from "react"
import { SettingsModal } from "./SettingsModal"

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-8 left-8 z-50">
        <Button
          size="icon"
          variant="outline"
          className="h-16 w-16 rounded-full shadow-2xl bg-background hover:scale-105 transition-transform border-muted-foreground/20"
          onClick={() => setIsOpen(true)}
        >
          <HandCoins className="h-8 w-8 text-foreground" />
        </Button>
      </div>

      <SettingsModal key={isOpen ? 'open' : 'closed'} open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
