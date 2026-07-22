import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Mail, MessageSquare, Clipboard } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const placeholders = ["{{nome_cliente}}", "{{tipo_documento}}", "{{data_documento}}"];

export default function TemplateForm({ template, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: template?.name || "",
    type: template?.type || "email",
    subject: template?.subject || "",
    body: template?.body || ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const insertPlaceholder = (placeholder) => {
    const textarea = document.getElementById('body');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newValue = before + placeholder + after;
      
      handleInputChange('body', newValue);
      
      // Reposicionar cursor
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="card-shadow">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-xl">
            {formData.type === 'whatsapp' ? (
              <MessageSquare className="w-5 h-5 text-green-600" />
            ) : (
              <Mail className="w-5 h-5 text-blue-600" />
            )}
            {template ? "Editar Template" : "Novo Template"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Template *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Ex: Documento DAS Processado"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange("type", value)}
                  required
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campo de Assunto - apenas para E-mail */}
            {formData.type === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto do E-mail *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  placeholder="Seu documento {{tipo_documento}} foi processado!"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="body">
                {formData.type === 'email' ? 'Corpo do E-mail' : 'Mensagem do WhatsApp'} *
              </Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => handleInputChange("body", e.target.value)}
                placeholder={formData.type === 'email' 
                  ? "Olá {{nome_cliente}}, seu documento {{tipo_documento}} foi processado em {{data_documento}}..."
                  : "Olá {{nome_cliente}}! Seu documento {{tipo_documento}} foi processado. Data: {{data_documento}}. Atenciosamente, A&L Contabilidade."
                }
                rows={formData.type === 'email' ? 8 : 5}
                required
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Variáveis disponíveis</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {placeholders.map(p => (
                  <Badge 
                    key={p} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => insertPlaceholder(p)}
                    title="Clique para inserir no texto"
                  >
                    <Clipboard className="w-3 h-3 mr-1" />
                    {p}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Clique nas variáveis acima para inseri-las no texto da mensagem
              </p>
            </div>

            {/* Preview */}
            {formData.body && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className={`p-4 rounded-lg border-2 ${formData.type === 'email' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="text-sm space-y-1">
                    {formData.type === 'email' && formData.subject && (
                      <div><strong>Assunto:</strong> {formData.subject}</div>
                    )}
                    <div><strong>Mensagem:</strong></div>
                    <div className="whitespace-pre-wrap text-gray-700">{formData.body}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
                <X className="w-4 h-4" /> Cancelar
              </Button>
              <Button type="submit" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4" /> Salvar Template
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}