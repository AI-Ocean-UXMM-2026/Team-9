import {
  Boxes,
  Briefcase,
  CircleDollarSign,
  CircleHelp,
  Home,
  Megaphone,
  Package,
  Store,
  Tag,
  Truck,
  Utensils,
  Zap,
} from 'lucide-react';

export function ActivityCategoryIcon({
  categoryId,
}: {
  categoryId: string | null;
}) {
  const iconProps = { size: 20, strokeWidth: 1.9, 'aria-hidden': true as const };
  switch (categoryId) {
    case 'client-income': return <Briefcase {...iconProps} />;
    case 'sales': return <Store {...iconProps} />;
    case 'other-income': return <CircleDollarSign {...iconProps} />;
    case 'supplies': return <Package {...iconProps} />;
    case 'inventory': return <Boxes {...iconProps} />;
    case 'transport': return <Truck {...iconProps} />;
    case 'utilities': return <Zap {...iconProps} />;
    case 'rent': return <Home {...iconProps} />;
    case 'marketing': return <Megaphone {...iconProps} />;
    case 'food': return <Utensils {...iconProps} />;
    case 'other-expense': return <CircleHelp {...iconProps} />;
    default: return <Tag {...iconProps} />;
  }
}
