import { Landmark, Bean, Coins, Building2, Car, Gem, Stamp, CreditCard } from 'lucide-react'

export const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'CASH': return Coins;
    case 'STOCK':
    case 'FUND': return Landmark;
    case 'REAL_ESTATE': return Building2;
    case 'VEHICLE': return Car;
    case 'PRECIOUS_METAL': return Gem;
    case 'COLLECTIBLE': return Stamp;
    case 'LIABILITY': return CreditCard;
    default: return Bean;
  }
}
