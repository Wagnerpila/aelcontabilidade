import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Upload, 
  UserPlus, 
  FileText,
  Zap
} from "lucide-react";

const actions = [
  {
    title: "Processar Documentos",
    description: "Upload e processamento automático",
    icon: Upload,
    url: "Upload",
    color: "bg-blue-500 hover:bg-blue-600"
  },
  {
    title: "Cadastrar Cliente",
    description: "Adicionar novo cliente",
    icon: UserPlus,
    url: "Clientes",
    color: "bg-green-500 hover:bg-green-600"
  },
  {
    title: "Ver Monitor",
    description: "Acompanhar processamentos",
    icon: FileText,
    url: "Monitor",
    color: "bg-purple-500 hover:bg-purple-600"
  }
];

export default function QuickActions() {
  return (
    <Card className="card-shadow hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-yellow-500" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => (
          <Link key={index} to={createPageUrl(action.url)}>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 p-4 h-auto hover-lift"
            >
              <div className={`p-2 rounded-lg ${action.color} text-white`}>
                <action.icon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className="text-xs text-gray-500">{action.description}</div>
              </div>
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}