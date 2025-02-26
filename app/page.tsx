'use client';

import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Package, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

const data = [
  { name: 'Jan', value: 400 },
  { name: 'Fev', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Abr', value: 800 },
  { name: 'Mai', value: 500 },
  { name: 'Jun', value: 700 },
];

const statsCards = [
  {
    title: 'Total de Itens',
    value: '2,847',
    description: '+12.5% em relação ao mês anterior',
    icon: Package,
    color: 'text-blue-500',
  },
  {
    title: 'Movimentações',
    value: '156',
    description: 'Nas últimas 24 horas',
    icon: TrendingUp,
    color: 'text-green-500',
  },
  {
    title: 'Itens em Falta',
    value: '23',
    description: 'Necessitam reposição',
    icon: AlertTriangle,
    color: 'text-red-500',
  },
  {
    title: 'Última Atualização',
    value: '5 min',
    description: 'Dados em tempo real',
    icon: Clock,
    color: 'text-purple-500',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export default function Home() {
  return (
    <div className="container py-6">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
      >
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div key={index} variants={item}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2"
      >
        <Card>
          <CardHeader>
            <CardTitle>Consumo de Estoque</CardTitle>
            <CardDescription>
              Análise dos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimas movimentações no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Movimentação de Estoque
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Item transferido do Setor A para Setor B
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    há {i + 1}h
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}