'use client';

import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Users, Clock, Shield } from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Gestão de Estoque',
    description: 'Controle completo do seu inventário com atualizações em tempo real e alertas inteligentes.',
  },
  {
    icon: Users,
    title: 'Alto Desempenho',
    description: 'Acelere suas operações com um sistema de gestão de estoque eficiente e escalável.',
  },
  {
    icon: Clock,
    title: 'Histórico Completo',
    description: 'Rastreamento detalhado de todas as operações realizadas no sistema.',
  },
  {
    icon: Shield,
    title: 'Segurança Avançada',
    description: 'Proteção de dados com criptografia e backup automático em nuvem.',
  },
];

const teamMembers = [
  {
    name: 'Paulo Oliveira',
    role: 'Desenvolvedor Fullstack',
    image: 'https://media.licdn.com/dms/image/v2/D4D03AQGV22lccQ4y9w/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1687893007583?e=1746057600&v=beta&t=bySB8gssQ8GiYMU33fMlcc5MBZVzPQUAhYAwt8oKgTA',
  }
];

export default function AboutPage() {
  return (
    <div className="container py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">StockSense</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sistema moderno de gestão de estoque desenvolvido para otimizar seus processos
            e aumentar a eficiência do seu negócio.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <Icon className="h-8 w-8 mb-2" />
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>
              Conheça o resposável por trás do StockSense
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <h3 className="font-medium">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Pronto para começar?</h2>
          <Button size="lg">
            Entre em Contato
          </Button>
        </div>
      </motion.div>
    </div>
  );
}