'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Box,
  BarChart,
  Scissors,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const menuItems = [
  { icon: Box, label: 'Setores', href: '/sectors' },
  { icon: Box, label: 'Rotativos', href: '/rotativo' },
  { icon: BarChart, label: 'Estoque', href: '/inventory' },
  { icon: Scissors, label: 'Corte', href: '/cutting' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
  { icon: Info, label: 'Sobre', href: '/about' },
];

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();

  return (
    <motion.div
      initial={{ width: 240 }}
      animate={{ width: isExpanded ? 240 : 80 }}
      className="h-screen bg-background border-r flex flex-col"
    >
      <div className="p-4 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground',
                    !isExpanded && 'justify-center'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {isExpanded && <span>{item.label}</span>}
                </Link>
              </TooltipTrigger>
              {!isExpanded && (
                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>
    </motion.div>
  );
}