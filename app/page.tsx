'use client';

import React, { useState, useEffect } from 'react';
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

interface DashboardStats {
  totalRotativos: number;
  totalItensContados: number;
  totalDivergencia: number;
  ultimoRotativo: string;
  consumoEstoque: { data_feita: string; totalContagem: number }[];
  atividadeRecente: string;
}

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardStats>({
    totalRotativos: 0,
    totalItensContados: 0,
    totalDivergencia: 0,
    ultimoRotativo: '',
    consumoEstoque: [],
    atividadeRecente: 'a ser implementado',
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Busca os dados do dashboard a partir da API exclusiva
  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/calculos_dashboard');
        const json = await res.json();
        setDashboard(json);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  // Atualiza os valores dos cards com base no dashboard retornado
  const statsCards = [
    {
      title: 'Total de Rotativos do Mês',
      value: dashboard.totalRotativos.toString(),
      description: 'Datas únicas em ss_setores',
      icon: Package,
      color: 'text-blue-500',
    },
    {
      title: 'Total de Itens Contados',
      value: dashboard.totalItensContados.toString(),
      description: 'Códigos únicos na data mais atual',
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      title: 'Total de Divergência',
      value: dashboard.totalDivergencia.toString(),
      description: 'Códigos com divergência (não duplicados)',
      icon: AlertTriangle,
      color: 'text-red-500',
    },
    {
      title: 'Último Rotativo Feito',
      value: dashboard.ultimoRotativo,
      description: 'Data mais recente',
      icon: Clock,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="container py-6">
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando indicadores...</p>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4"
          >
            {statsCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div key={index} className="p-2" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                  <Card>
                    <CardHeader className="flex items-center justify-between pb-1">
                      <CardTitle className="text-xs font-medium">{card.title}</CardTitle>
                      <Icon className={`h-3 w-3 ${card.color}`} />
                    </CardHeader>
                    <CardContent className="space-y-0">
                      <div className="text-lg font-bold">{card.value}</div>
                      <p className="text-[10px] text-muted-foreground">{card.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 md:grid-cols-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gestão de Estoque</CardTitle>
                <CardDescription className="text-[10px]">
                  Comparativo por data (contagem única por código)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboard.consumoEstoque}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data_feita" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="totalContagem"
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
                <CardTitle className="text-sm">Atividade Recente</CardTitle>
                <CardDescription className="text-[10px]">
                  {dashboard.atividadeRecente}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  A ser implementado
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
