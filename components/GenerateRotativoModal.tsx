'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ManualItem {
  material: string;
  descricao: string;
  posicao: string;
  um: string;
}

interface GenerateRotativoModalProps {
  onClose: () => void;
  onGenerate: (config: {
    includeCorte: boolean;
    includeZerados: boolean;
    manualItems: ManualItem[];
  }) => void;
}

export default function GenerateRotativoModal({
  onClose,
}: GenerateRotativoModalProps) {
  const [includeCorte, setIncludeCorte] = useState<boolean>(false);
  const [deposito, setDeposito] = useState<string>('DP01');
  const [includeZerados, setIncludeZerados] = useState<boolean>(false);
  const [includeManual, setIncludeManual] = useState<boolean>(false);
  const [manualItem, setManualItem] = useState<ManualItem>({
    material: '',
    descricao: '',
    posicao: '',
    um: '',
  });
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);

  const handleAddManualItem = () => {
    if (!manualItem.material.trim()) {
      alert("Preencha o campo 'Material'");
      return;
    }
    setManualItems([...manualItems, manualItem]);
    setManualItem({ material: '', descricao: '', posicao: '', um: '' });
  };

  const handleGeneratePlanilha = () => {
    const config = {
      deposito: '',
      includeCorte,
      includeZerados,
      manualItems,
    };
    onGenerate(config);
  };


  async function onGenerate(config: {
    deposito: string;
    includeCorte: boolean;
    includeZerados: boolean;
    manualItems: ManualItem[];
  }) {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        throw new Error("Erro ao gerar planilha");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rotativo.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    }
  }
  

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60 p-4"
    >
      <motion.div 
        initial={{ scale: 0.8 }} 
        animate={{ scale: 1 }} 
        exit={{ scale: 0.8 }} 
        transition={{ duration: 0.3 }}
        className="bg-black p-6 rounded-lg shadow-2xl w-full max-w-3xl mx-4"
      >
        <h2 className="text-xl font-bold mb-2">Gerar Rotativo</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure as opções e gere a planilha.
        </p>
        <div className="space-y-4">
        {/* Seleção do depósito */}
        <div className="mb-4">
          <Label htmlFor="deposito" className="text-sm font-medium">Selecione o Depósito</Label>
          <select
            id="deposito"
            value={deposito}
            onChange={(e) => setDeposito(e.target.value)}
            className="border rounded p-2 text-sm w-full"
          >
            <option value="DP01">DP01 - Mercearia</option>
            <option value="DP40">DP40 - Perecíveis</option>
          </select>
        </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Adicionar itens do corte</span>
            <Switch checked={includeCorte} onCheckedChange={setIncludeCorte} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Adicionar itens zerados do último rotativo
            </span>
            <Switch checked={includeZerados} onCheckedChange={setIncludeZerados} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Adicionar item manual</span>
            <Switch checked={includeManual} onCheckedChange={setIncludeManual} />
          </div>
          {includeManual && (
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold">Novo Item Manual</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  placeholder="Material" 
                  value={manualItem.material}
                  onChange={(e) =>
                    setManualItem({ ...manualItem, material: e.target.value })
                  }
                  className="text-sm"
                />
                <Input 
                  placeholder="Descrição" 
                  value={manualItem.descricao}
                  onChange={(e) =>
                    setManualItem({ ...manualItem, descricao: e.target.value })
                  }
                  className="text-sm"
                />
                <Input 
                  placeholder="Posição" 
                  value={manualItem.posicao}
                  onChange={(e) =>
                    setManualItem({ ...manualItem, posicao: e.target.value })
                  }
                  className="text-sm"
                />
                <Input 
                  placeholder="UM" 
                  value={manualItem.um}
                  onChange={(e) =>
                    setManualItem({ ...manualItem, um: e.target.value })
                  }
                  className="text-sm"
                />
              </div>
              <Button onClick={handleAddManualItem} className="mt-2 text-sm" variant="default">
                Adicionar Item
              </Button>
              {manualItems.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium">Itens adicionados:</p>
                  <ul className="list-disc list-inside text-xs">
                    {manualItems.map((item, index) => (
                      <li key={index}>
                        {item.material} - {item.descricao} - {item.posicao} - {item.um}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end mt-6 space-x-4">
          <Button variant="outline" onClick={onClose} className="px-4 py-2 text-sm">
            Fechar
          </Button>
          <Button variant="default" onClick={handleGeneratePlanilha} className="px-4 py-2 text-sm">
            Gerar Planilha
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
