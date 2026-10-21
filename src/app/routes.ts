import {
  LayoutDashboard,
  ArrowLeftRight,
  ScanLine,
  Users,
  CalendarDays,
  ChartNoAxesCombined,
  MessageCircle,
  ClipboardCheck,
  Settings,
} from 'lucide-react';
export const screens = [
  { id: 'dashboard', path: '/', icon: LayoutDashboard },
  { id: 'transactions', path: '/transactions', icon: ArrowLeftRight },
  { id: 'capture', path: '/capture', icon: ScanLine },
  { id: 'owed', path: '/owed', icon: Users },
  { id: 'schedules', path: '/schedules', icon: CalendarDays },
  { id: 'insights', path: '/insights', icon: ChartNoAxesCombined },
  { id: 'chat', path: '/chat', icon: MessageCircle },
  { id: 'readiness', path: '/readiness', icon: ClipboardCheck },
  { id: 'settings', path: '/settings', icon: Settings },
] as const;
export type ScreenId = (typeof screens)[number]['id'];
