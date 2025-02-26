'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SetorRecord {
  id: number;
  endereco: string;
  codigo: string;
  descricao: string;
  um: string;
  contagem: number;
  qtd_cx: number; 
  qtd_por_cx: number;
  saldo: number;
  diferenca: number;
  preco: number;
  v_ajuste: number;
  corte: string;
  setor: string;
  data_feita: string;
}

export default function SetoresPage() {
  const [currentView, setCurrentView] = useState<'menu' | 'abrir'>('menu');
  const [data, setData] = useState<SetorRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [unsaved, setUnsaved] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [setorFilter, setSetorFilter] = useState<string>('');
  const router = useRouter();

  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState<string>('');

  const [calcModal, setCalcModal] = useState<boolean>(false);
  const [calcProgress, setCalcProgress] = useState<number>(0);
  const [calcMessage, setCalcMessage] = useState<string>("");


  async function fetchData() {
    try {
      const res = await fetch(`/api/setores?table=ss_setores`);
      const json = await res.json();
      let records: SetorRecord[] = Array.isArray(json.data) ? json.data : [];
      if (selectedDate) {
        records = records.filter(record => record.data_feita === selectedDate);
      }
      setData(records);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    }
  }

  useEffect(() => {
    if (currentView === 'abrir') {
      fetchData();
    }
  }, [selectedDate, currentView]);

  const availableDates = Array.from(new Set(data.map(r => r.data_feita))).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );


  const filteredData = data.filter(row => {
    const searchMatch =
      row.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const setorMatch = setorFilter ? row.setor === setorFilter : true;
    return searchMatch && setorMatch;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  async function recalculateAll() {
    try {
      setCalcModal(true);
      setCalcProgress(0);
      setCalcMessage("Iniciando cálculo...");
      const res = await fetch('/api/calculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (!res.body) throw new Error("Resposta sem body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let resultsData: any[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const events = chunk.split('\n\n');
        events.forEach(eventStr => {
          if (eventStr.startsWith('data: ')) {
            const message = eventStr.slice(6).trim();
            try {
              const parsed = JSON.parse(message);
              if (Array.isArray(parsed)) {
                resultsData = parsed;
              }
            } catch (err) {
              setCalcMessage(message);
              const match = message.match(/^(\d+)%/);
              if (match) {
                setCalcProgress(Number(match[1]));
              }
            }
          }
        });
      }
      setCalcModal(false);
      if (resultsData.length > 0) {
        setData(resultsData);
        setUnsaved(true);
      }
    } catch (error: any) {
      console.error("Erro no recalculo:", error);
      setCalcMessage("Erro: " + error.message);
      setCalcModal(false);
    }
  }

  async function handleSave() {
    try {
      const res = await fetch('/api/setores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        alert('Erro ao salvar as alterações');
      } else {
        alert('Alterações salvas com sucesso');
        setUnsaved(false);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar as alterações');
    }
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsaved]);

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadMessage('Iniciando upload...');
    
    try {
      const response = await fetch('/api/rotatio', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        setUploadMessage('Erro no upload');
        setIsUploading(false);
        return;
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) return;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const events = chunk.split('\n\n');
        events.forEach(eventStr => {
          if (eventStr.startsWith('data: ')) {
            const message = eventStr.replace('data: ', '').trim();
            console.log('Mensagem SSE Rotativo:', message);
            if (message.includes('% concluído')) {
              const progress = parseInt(message.split('%')[0]);
              setUploadProgress(progress);
            }
            if (message.includes('Upload realizado com sucesso')) {
              setUploadMessage('Upload realizado com sucesso!');
            }
          }
        });
      }
      setIsUploading(false);
      setShowUploadModal(false);
      setCurrentView('abrir');
    } catch (error) {
      console.error(error);
      setUploadMessage('Erro durante o upload');
      setIsUploading(false);
    }
  }

  const renderMenu = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="text-3xl font-bold">Setores</h1>
      <p className="text-muted-foreground">Selecione uma opção para análise por setores</p>
      <div className="flex flex-col space-y-4">
        <Button className="w-full py-4 text-xl" variant="outline" onClick={() => setShowUploadModal(true)}>
          Nova Análise de Rotativo
        </Button>
        <Button className="w-full py-4 text-xl" variant="outline" onClick={() => setCurrentView('abrir')}>
          Abrir Rotativo Existente
        </Button>
        <Button className="w-full py-4 text-xl" variant="outline">
          Gerar Contagem de Rotativo
        </Button>
        <Button className="w-full py-4 text-xl" variant="outline">
          Exclusão de Rotativos
        </Button>
      </div>
      <Card>
        <p className="p-4 text-lg">Selecione uma opção para iniciar a análise.</p>
      </Card>
    </motion.div>
  );

  const renderAbrirRotativo = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">Abrir Rotativo Existente</h1>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <Button onClick={recalculateAll} className="px-6 py-3 text-xl w-full md:w-auto" variant="outline">
            Recalcular
          </Button>
          <Button onClick={handleSave} className="px-6 py-3 text-xl w-full md:w-auto" variant="default">
            Salvar
          </Button>
          <Input
            placeholder="Pesquisar..."
            className="w-full md:w-auto"
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
          <select
            className="border rounded p-2 text-xl w-full md:w-auto"
            value={selectedDate}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedDate(e.target.value)}
          >
            <option value="">Todas as datas</option>
            {availableDates.map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
          <select
            className="border rounded p-2 text-xl w-full md:w-auto"
            value={setorFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSetorFilter(e.target.value)}
          >
            <option value="">Todos os setores</option>
            <option value="Mercearia">Mercearia</option>
            <option value="Perecíveis">Perecíveis</option>
          </select>
          <Button variant="outline" onClick={() => setCurrentView('menu')} className="px-6 py-3 text-xl w-full md:w-auto">
            Voltar ao Menu
          </Button>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        <table className="min-w-full border-collapse">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-2 border">Endereço</TableHead>
              <TableHead className="px-4 py-2 border">Código</TableHead>
              <TableHead className="px-4 py-2 border">Descrição</TableHead>
              <TableHead className="px-4 py-2 border">UM</TableHead>
              <TableHead className="px-4 py-2 border">Contagem</TableHead>
              <TableHead className="px-4 py-2 border">Qtd Cx</TableHead>
              <TableHead className="px-4 py-2 border">Qtd por Cx</TableHead>
              <TableHead className="px-4 py-2 border">Saldo</TableHead>
              <TableHead className="px-4 py-2 border">Diferença</TableHead>
              <TableHead className="px-4 py-2 border">Preço</TableHead>
              <TableHead className="px-4 py-2 border">V/Ajuste</TableHead>
              <TableHead className="px-4 py-2 border">Corte</TableHead>
              <TableHead className="px-4 py-2 border">Setor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-4">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="px-4 py-2 border">{row.endereco}</TableCell>
                  <TableCell className="px-4 py-2 border">{row.codigo}</TableCell>
                  <TableCell className="px-4 py-2 border">{row.descricao}</TableCell>
                  <TableCell className="px-4 py-2 border">{row.um}</TableCell>
                  <TableCell className="px-4 py-2 border">{row.contagem}</TableCell>
                  <TableCell className="px-4 py-2 border">
                    <Input
                      value={row.qtd_cx}
                      onChange={(e) => {
                        const newVal = Number(e.target.value);
                        setData(prev =>
                          prev.map(r =>
                            r.id === row.id ? { ...r, qtd_cx: newVal } : r
                          )
                        );
                        setUnsaved(true);
                      }}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell className="px-4 py-2 border">{row.qtd_por_cx}</TableCell>
                  <TableCell className="px-4 py-2 border">{row.saldo}</TableCell>
                  <TableCell className="px-4 py-2 border">{row.diferenca}</TableCell>
                  <TableCell className="px-4 py-2 border">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.preco)}</TableCell>
                  <TableCell className="px-4 py-2 border">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.v_ajuste)}</TableCell>
                  <TableCell className="px-4 py-2 border">{row.corte}</TableCell>
                  <TableCell className="px-4 py-2 border">{row.setor}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>
    </motion.div>
  );

  const renderCalcModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-black bg-opacity-60 p-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className="bg-black p-8 rounded-lg shadow-2xl w-full max-w-lg"
      >
        <h2 className="text-2xl font-bold mb-4">Processando Cálculo</h2>
        <p className="text-lg mb-2">Progresso: {calcProgress}%</p>
        <p className="text-lg mb-4">{calcMessage}</p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setCalcModal(false)} className="px-6 py-3 text-xl">
            Fechar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="container py-6">
      {currentView === 'menu' ? renderMenu() : renderAbrirRotativo()}
      
      {showUploadModal && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60"
        >
          <motion.div 
            initial={{ scale: 0.8 }} 
            animate={{ scale: 1 }} 
            exit={{ scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="bg-black p-8 rounded-lg shadow-2xl w-full max-w-3xl mx-4"
          >
            <h2 className="text-2xl font-bold mb-6 text-white">Nova Análise de Rotativo</h2>
            <p className="mb-6 text-lg text-white">
              Faça o upload da planilha com as colunas:
              <span className="font-mono text-sm ml-2">
                cod_posicao, material, descricao, um, quantidade_informada, quantidade_contada, status, usuario, data_rotativo
              </span>.
            </p>
            <Input type="file" onChange={handleFileUpload} className="mb-6" />
            {isUploading && (
              <p className="mt-4 text-xl font-semibold text-white">Progresso: {uploadProgress}%</p>
            )}
            {uploadMessage && !isUploading && (
              <p className="mt-4 text-xl font-semibold text-white">{uploadMessage}</p>
            )}
            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setShowUploadModal(false)} className="px-8 py-3 text-xl">
                Fechar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {calcModal && renderCalcModal()}
    </div>
  );
}
