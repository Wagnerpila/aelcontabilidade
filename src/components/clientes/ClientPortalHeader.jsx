import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Mail, Phone, Edit } from "lucide-react";

const preferenceColors = {
  email: "bg-blue-100 text-blue-800 border-blue-200",
  whatsapp: "bg-green-100 text-green-800 border-green-200",
  ambos: "bg-purple-100 text-purple-800 border-purple-200"
};

const preferenceLabels = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  ambos: "E-mail e WhatsApp"
};

export default function ClientPortalHeader({ cliente, documentCount, onEdit }) {
  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-blue-50 rounded-xl flex items-center justify-center">
              <Building2 className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{cliente.nome}</h1>
                {!cliente.ativo && <Badge variant="destructive">Inativo</Badge>}
              </div>
              <p className="font-mono text-gray-500 mt-1">{cliente.cpf_cnpj}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> {cliente.email}
                </div>
                {cliente.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> {cliente.telefone}
                  </div>
                )}
                <Badge variant="secondary" className={preferenceColors[cliente.preferencia_envio]}>
                  {preferenceLabels[cliente.preferencia_envio]}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{documentCount}</p>
              <p className="text-sm text-gray-500">Documentos</p>
            </div>
            <Button onClick={onEdit} variant="outline" className="gap-2 hover-lift">
              <Edit className="w-4 h-4" />
              Editar Cliente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}