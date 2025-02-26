'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CorteRecord {
  material: string | number;
  dep: string;
  quantidade: number;
  descricao: string;
  data: string;
}

interface GroupedCorte {
  material: string | number;
  descricao: string;
  total: number;
}

export default function CuttingPage() {
  const [data, setData] = useState<CorteRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/estoque?table=ss_corte_geral");
      if (!res.ok) throw new Error("Erro ao buscar dados de corte");
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const availableDates: string[] = Array.from(new Set(data.map(item => item.data))).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const filteredData = selectedDate ? data.filter(item => item.data === selectedDate) : data;

  const merceariaRecords = filteredData.filter(item => item.dep && item.dep.toUpperCase() === "MERCEARIA");
  const pereciveisRecords = filteredData.filter(item => item.dep && item.dep.toUpperCase() === "PERECÍVEIS");

  const groupRecords = (records: CorteRecord[]): GroupedCorte[] => {
    const groups: Record<string, GroupedCorte> = {};
    records.forEach(record => {
      const key = `${record.material}-${record.descricao}`;
      const qty = Number(record.quantidade) || 0;
      if (groups[key]) {
        groups[key].total += qty;
      } else {
        groups[key] = {
          material: record.material,
          descricao: record.descricao,
          total: qty,
        };
      }
    });
    return Object.values(groups);
  };

  const merceariaGrouped = groupRecords(merceariaRecords);
  const pereciveisGrouped = groupRecords(pereciveisRecords);

  return (
    <div className="container py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Setor de Corte</h1>
            <p className="text-muted-foreground">Gerenciamento de ordens de corte</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-medium">Filtrar por data:</span>
            <select
              className="border rounded p-2"
              value={selectedDate}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedDate(e.target.value)}
            >
              {availableDates.map(date => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10">Carregando...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">Erro: {error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Mercearia</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2">Material</th>
                      <th className="text-left py-2">Descrição</th>
                      <th className="text-right py-2">Total de Corte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merceariaGrouped.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{item.material}</td>
                        <td className="py-2">{item.descricao}</td>
                        <td className="py-2 text-right">{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Perecíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2">Material</th>
                      <th className="text-left py-2">Descrição</th>
                      <th className="text-right py-2">Total de Corte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pereciveisGrouped.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{item.material}</td>
                        <td className="py-2">{item.descricao}</td>
                        <td className="py-2 text-right">{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}
