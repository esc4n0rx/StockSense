'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileDown, Filter } from 'lucide-react';

interface ColumnConfig {
  header: string;
  accessor: string;
}

const columns: ColumnConfig[] = [
  { header: 'Código', accessor: 'codigo' },
  { header: 'Descrição', accessor: 'descricao' },
  { header: 'U.M.', accessor: 'unidade_medida' },
  { header: 'Contagem', accessor: 'contagem' },
  { header: 'Saldo SAP', accessor: 'saldo_sap' },
  { header: 'Diferença', accessor: 'diferenca' },
  { header: 'Status', accessor: 'status' },
];

export default function ControleRotativoPage() {
  const [data, setData] = useState<any[]>([]);
  const [codigosRotativos, setCodigosRotativos] = useState<string[]>([]);
  const [selectedCodigo, setSelectedCodigo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/controle_rotativo');
      const json = await res.json();
      const allData = json.data || [];
      setData(allData);

      const codigos: string[] = Array.from(new Set(allData.map((item: any) => item.cod_rotativo)));
      codigos.sort((a, b) => (a > b ? -1 : 1));
      setCodigosRotativos(codigos);
      if (!selectedCodigo && codigos.length > 0) setSelectedCodigo(codigos[0]);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar os dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data
    .filter((item) => selectedCodigo === '' || item.cod_rotativo === selectedCodigo)
    .filter((item) =>
      Object.values(item).some((val) =>
        val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

  return (
    <div className="container py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Inventário Rotativo</h1>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            className="border rounded p-2"
            value={selectedCodigo}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCodigo(e.target.value)}
          >
            {codigosRotativos.map((codigo) => (
              <option key={codigo} value={codigo}>
                {codigo}
              </option>
            ))}
          </select>

          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />Filtros
          </Button>
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />Exportar
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-10">Carregando...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">Erro: {error}</div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col, index) => (
                    <TableHead key={index}>{col.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={index}>
                    {columns.map((col, i) => (
                      <TableCell key={i}>{item[col.accessor] ?? ''}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </div>
  );
}