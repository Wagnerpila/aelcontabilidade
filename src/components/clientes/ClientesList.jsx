
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label"; // Added Label for checkbox
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users,
  Edit,
  Mail,
  Phone,
  Building2,
  MessageSquare,
  Trash2,
  AlertCircle,
  Eye
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

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

export default function ClientesList({ 
  clientes, 
  isLoading, 
  onEdit, 
  onDelete, 
  searchTerm,
  selectedClientes, // New prop for selected clients Set
  onToggleSelect,   // New prop to toggle individual client selection
  onToggleSelectAll, // New prop to toggle all clients selection
  onBulkDelete      // New prop for bulk deletion
}) {
  if (isLoading) {
    return (
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Clientes Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clientes.length === 0) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? `Não encontramos clientes com "${searchTerm}"`
              : "Comece cadastrando seus primeiros clientes para processamento automático"
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  const numSelected = selectedClientes.size;
  const allSelected = numSelected === clientes.length && clientes.length > 0;

  return (
    <Card className="card-shadow">
      <CardHeader className="border-b border-gray-100">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="w-5 h-5 text-blue-600" />
            Clientes Cadastrados ({clientes.length})
          </CardTitle>
          {numSelected > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{numSelected} selecionado(s)</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="w-4 h-4"/>
                    Excluir Selecionados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      Confirmar Exclusão em Massa
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir <strong>{numSelected} cliente(s)</strong>? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onBulkDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Sim, excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          <div className="p-6 bg-gray-50/50">
            <div className="flex items-center">
              <Checkbox
                id="selectAll"
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
                className="mr-6"
              />
              <Label htmlFor="selectAll" className="font-semibold text-gray-700">
                {allSelected ? "Desmarcar Todos" : "Marcar Todos"}
              </Label>
            </div>
          </div>
          {clientes.map((cliente, index) => (
            <motion.div
              key={cliente.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-6 transition-colors ${selectedClientes.has(cliente.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <Checkbox
                    checked={selectedClientes.has(cliente.id)}
                    onCheckedChange={() => onToggleSelect(cliente.id)}
                    className="mr-2" // Added margin for spacing
                  />
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {cliente.nome}
                      </h3>
                      {!cliente.ativo && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Inativo
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="font-mono">{cliente.cpf_cnpj}</span>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {cliente.email}
                      </div>
                      {cliente.telefone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {cliente.telefone}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${preferenceColors[cliente.preferencia_envio]}`}
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {preferenceLabels[cliente.preferencia_envio]}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={createPageUrl(`ClientPortal?id=${cliente.id}`)}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 hover-lift"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Portal
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEdit(cliente)}
                    className="hover-lift"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="hover-lift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o cliente <strong>{cliente.nome}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(cliente.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Sim, excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
