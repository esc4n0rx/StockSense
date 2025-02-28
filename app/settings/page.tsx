'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Building2,
  Cloud,
  Save,
  UploadCloud,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ProgressBar from '@/components/ui/progress-bar';

export default function SettingsPage() {
  const [uploadWmsProgress, setUploadWmsProgress] = useState<number>(0);
  const [uploadMmProgress, setUploadMmProgress] = useState<number>(0);
  const [uploadCorteProgress, setUploadCorteProgress] = useState<number>(0);

  const [isUploadingMm60, setIsUploadingMm60] = useState<boolean>(false);
  const [isUploadingCadastral, setIsUploadingCadastral] = useState<boolean>(false);
  const [baseUploadProgressMm60, setBaseUploadProgressMm60] = useState<number>(0);
  const [baseUploadProgressCadastral, setBaseUploadProgressCadastral] = useState<number>(0);

  const [backupLoading, setBackupLoading] = useState<boolean>(false);

  async function handleUpload(tipo: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('type', tipo);
    formData.append('file', file);

    try {
      const response = await fetch('/api/estoque', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        console.error('Erro no upload');
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
            console.log('Mensagem SSE:', message);
            if (message.includes('% concluído')) {
              const progress = parseInt(message.split('%')[0]);
              if (tipo === 'estoque_wms') setUploadWmsProgress(progress);
              else if (tipo === 'estoque_mm') setUploadMmProgress(progress);
              else if (tipo === 'corte') setUploadCorteProgress(progress);
            }
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleUploadBase(table: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('table', table);
    formData.append('file', file);

    try {
      if (table === 'ss_mm60') {
        setIsUploadingMm60(true);
        setBaseUploadProgressMm60(0);
      } else if (table === 'ss_dados_cadastral') {
        setIsUploadingCadastral(true);
        setBaseUploadProgressCadastral(0);
      }
      
      const response = await fetch('/api/setores', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        console.error('Erro no upload para Dados Base');
        if (table === 'ss_mm60') setIsUploadingMm60(false);
        else if (table === 'ss_dados_cadastral') setIsUploadingCadastral(false);
        return;
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        console.log('SSE Dados Base chunk:', chunk);
        const events = chunk.split('\n\n');
        events.forEach(eventStr => {
          if (eventStr.startsWith('data: ')) {
            const message = eventStr.replace('data: ', '').trim();
            console.log('Mensagem SSE Dados Base:', message);
            if (message.includes('% concluído')) {
              const progress = parseInt(message.split('%')[0]);
              if (table === 'ss_mm60') setBaseUploadProgressMm60(progress);
              else if (table === 'ss_dados_cadastral') setBaseUploadProgressCadastral(progress);
            }
          }
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (table === 'ss_mm60') setIsUploadingMm60(false);
      else if (table === 'ss_dados_cadastral') setIsUploadingCadastral(false);
    }
  }

  async function handleBackup(tabela: string) {
    try {
      setBackupLoading(true);
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabela }),
      });
      const json = await response.json();
      setBackupLoading(false);
      if (!response.ok) {
        alert('Erro no backup: ' + json.error);
      } else {
        alert(`Backup realizado com sucesso para ${tabela}.\nRegistros processados: ${json.backupResults ? JSON.stringify(json.backupResults) : 'OK'}`);
      }
    } catch (error: any) {
      setBackupLoading(false);
      console.error(error);
      alert('Erro no backup: ' + error.message);
    }
  }

  return (
    <div className="container py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do seu sistema
        </p>

        <Tabs defaultValue="geral">
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="dadosbase">Dados base</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          </TabsList>

          {/* Aba Geral */}
          <TabsContent value="geral" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  <CardTitle>Dados da Empresa</CardTitle>
                </div>
                <CardDescription>
                  Informações básicas da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="empresa">Nome da Empresa</Label>
                  <Input id="empresa" type="text" defaultValue="CD PAVUNA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" type="text" defaultValue="00.000.000/0001-90" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" type="text" defaultValue="Rua Embau,2207" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-5 w-5" />
                  <CardTitle>Upload</CardTitle>
                </div>
                <CardDescription>
                  Faça upload dos dados para as tabelas criadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="space-y-2">
                  <Label htmlFor="upload-wms">Upload Estoque WMS</Label>
                  <Input
                    id="upload-wms"
                    type="file"
                    onChange={(e) => handleUpload('estoque_wms', e)}
                  />
                  <ProgressBar progress={uploadWmsProgress} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upload-mm">Upload Estoque MM</Label>
                  <Input
                    id="upload-mm"
                    type="file"
                    onChange={(e) => handleUpload('estoque_mm', e)}
                  />
                  <ProgressBar progress={uploadMmProgress} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-corte">Upload Corte</Label>
                  <Input
                    id="upload-corte"
                    type="file"
                    onChange={(e) => handleUpload('corte', e)}
                  />
                  <ProgressBar progress={uploadCorteProgress} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dadosbase" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-5 w-5" />
                  <CardTitle>Dados Base</CardTitle>
                </div>
                <CardDescription>
                  Faça upload dos dados base para <code>ss_mm60</code> e <code>ss_dados_cadastral</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload ss_mm60 */}
                <div className="space-y-2">
                  <Label htmlFor="upload-mm60">Upload ss_mm60</Label>
                  <Input
                    id="upload-mm60"
                    type="file"
                    onChange={(e) => handleUploadBase('ss_mm60', e)}
                  />
                </div>
                {/* Upload ss_dados_cadastral */}
                <div className="space-y-2">
                  <Label htmlFor="upload-dados-cadastral">Upload ss_dados_cadastral</Label>
                  <Input
                    id="upload-dados-cadastral"
                    type="file"
                    onChange={(e) => handleUploadBase('ss_dados_cadastral', e)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Backup */}
          <TabsContent value="backup" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  <CardTitle>Backup</CardTitle>
                </div>
                <CardDescription>
                  Gere backup das tabelas principais para as de backup. Ao clicar, os dados serão movidos e a tabela principal limpa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => handleBackup('estoque_wms')}
                    className="w-full"
                  >
                    Backup Estoque WMS
                  </Button>
                  
                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => handleBackup('estoque_mm')}
                    className="w-full"
                  >
                    Backup Estoque MM
                  </Button>

                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => handleBackup('corte')}
                    className="w-full"
                  >
                    Backup Corte
                  </Button>
                </div>
                {/* Se necessário, backup System */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => handleBackup('system')}
                    className="w-full"
                  >
                    Backup System
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Notificações */}
          <TabsContent value="notificacoes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <CardTitle>Notificações</CardTitle>
                </div>
                <CardDescription>
                  Configure suas preferências de notificação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="alerta-estoque">Alertas de Erros</Label>
                  <Switch id="alerta-estoque" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notificacoes-pedidos">Notificações de Rotativo</Label>
                  <Switch id="notificacoes-pedidos" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="relatorios-semanais">Integrador</Label>
                  <Switch id="relatorios-semanais" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
