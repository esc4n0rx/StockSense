'use client';

import Link from 'next/link';
import { ModeToggle } from '@/components/mode-toggle';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container h-full flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6" />
          <Link href="/">
            <span className="text-xl font-semibold cursor-pointer">StockSense</span>
          </Link>
        </div>
        <ModeToggle />
      </div>
    </motion.header>
  );
}
