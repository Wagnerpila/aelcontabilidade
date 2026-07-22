import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Zap, MessageSquare } from 'lucide-react';

export default function SubscriptionPage() {
  const handleUpgradeClick = () => {
    const adminPhone = "5542991153552";
    const message = encodeURIComponent("Olá! Gostaria de fazer o upgrade da minha conta para o plano PRO. Por favor, me envie as instruções.");
    const whatsappUrl = `https://wa.me/${adminPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Planos e Assinatura</h1>
      <p className="text-gray-600 mb-8">Faça o upgrade para o plano PRO e desbloqueie todo o potencial da plataforma.</p>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Plano Gratuito</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-bold text-2xl">R$ 0,00 <span className="text-sm font-normal">/mês</span></p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 20 Clientes</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 10 Documentos / mês</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Notificações por E-mail</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500 relative">
          <div className="absolute top-0 right-4 -mt-3">
             <span className="px-3 py-1 text-sm font-semibold text-white bg-blue-500 rounded-full">Recomendado</span>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="text-yellow-500" />Plano PRO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="font-bold text-2xl">R$ 39,90 <span className="text-sm font-normal">/mês</span></p>
             <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Clientes Ilimitados</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Documentos Ilimitados</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Notificações por E-mail e WhatsApp</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Suporte Prioritário</li>
            </ul>
            <Button className="w-full mt-4 gap-2" onClick={handleUpgradeClick}>
              <MessageSquare className="w-4 h-4"/>
              Solicitar Upgrade via WhatsApp
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}