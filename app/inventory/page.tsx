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
import { Badge } from '@/components/ui/badge';
import { Search, FileDown, Filter } from 'lucide-react';

interface ColumnConfig {
  header: string;
  accessor: string;
}

interface TableConfig {
  label: string;
  columns: ColumnConfig[];
}

const tableConfigs: Record<string, TableConfig> = {
  ss_estoque_wms: {
    label: "Estoque WMS",
    columns: [
      { header: "Material", accessor: "material" },
      { header: "Centro", accessor: "centro" },
      { header: "Deposito", accessor: "dep" },
      { header: "Descrição", accessor: "texto_breve_material" },
      { header: "Posição", accessor: "pos_depos" },
      { header: "Estoque", accessor: "estoque_disponivel" },
      { header: "Opções", accessor: "options" },
    ],
  },
  ss_estoque_mm: {
    label: "Estoque MM",
    columns: [
      { header: "Centro", accessor: "centro" },
      { header: "Material", accessor: "material" },
      { header: "Descrição", accessor: "descricao" },
      { header: "Saldo Inicial", accessor: "saldo_inicial" },
      { header: "Estoque Final", accessor: "estoque_final" },
    ],
  },
  ss_corte_geral: {
    label: "Corte",
    columns: [
      { header: "Material", accessor: "material" },
      { header: "Depósito", accessor: "dep" },
      { header: "Quantidade", accessor: "quantidade" },
      { header: "Descrição", accessor: "descricao" },
      { header: "Data", accessor: "data" },
    ],
  },
};

export default function InventoryPage() {
  const [selectedTable, setSelectedTable] = useState<string>("ss_estoque_wms");
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Função para buscar os dados via API
  const fetchInventory = async (tableName: string): Promise<void> => {
    setIsLoading(true);
    setError("");
    console.log("Buscando dados para tabela:", tableName);
    try {
      const res = await fetch(`/api/estoque?table=${encodeURIComponent(tableName)}`);
      if (!res.ok) throw new Error("Erro ao buscar dados");
      const json = await res.json();
      setInventoryData(json.data);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory(selectedTable);
  }, [selectedTable]);

  // Filtra os dados com base no termo de busca
  const filteredData = inventoryData.filter((item: any) =>
    Object.keys(item).some((key) =>
      item[key]
        ? String(item[key]).toLowerCase().includes(searchTerm.toLowerCase())
        : false
    )
  );

  const config: TableConfig = tableConfigs[selectedTable];

  return (
    <div className="container py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Controle de Estoque</h1>
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
            value={selectedTable}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedTable(e.target.value)}
          >
            {Object.keys(tableConfigs).map((key) => (
              <option key={key} value={key}>
                {tableConfigs[key].label}
              </option>
            ))}
          </select>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
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
                  {config.columns.map((col, index) => (
                    <TableHead key={index}>{col.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={index}>
                    {config.columns.map((col, i) => (
                      <TableCell key={i}>
                        {col.accessor === "options" ? (
                          <div>
                            {/* Ações podem ser adicionadas aqui, se necessário */}
                          </div>
                        ) : (
                          item[col.accessor] || ""
                        )}
                      </TableCell>
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
