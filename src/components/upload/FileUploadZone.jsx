import React, { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  FileText, 
  X,
  Plus,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";

export default function FileUploadZone({ 
  onFileSelect, 
  files, 
  onRemoveFile, 
  onProcess, 
  isProcessing
}) {
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isProcessing) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    onFileSelect(droppedFiles);
  };

  const handleFileInput = (e) => {
    onFileSelect(e.target.files);
  };

  return (
    <div className="space-y-6">
      <Card className="card-shadow hover-lift">
        <CardContent className="p-8">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-all duration-200 ${isProcessing ? 'cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/50'}`}
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Arraste seus documentos aqui
            </h3>
            <p className="text-gray-600 mb-6">
              Ou clique para selecionar múltiplos arquivos PDF
            </p>
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
              ref={fileInputRef}
              disabled={isProcessing}
            />
            <Button as="span" className="bg-blue-600 hover:bg-blue-700 gap-2 pointer-events-none">
              <Plus className="w-4 h-4" />
              Selecionar Arquivos
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              Formatos suportados: PDF • Máximo: 10MB por arquivo
            </p>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="card-shadow">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Arquivos Selecionados ({files.length})
              </h3>
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                {files.map((file, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); onRemoveFile(index); }}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                      disabled={isProcessing}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
              <Button
                onClick={onProcess}
                disabled={files.length === 0 || isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 gap-2 text-lg py-6"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Iniciar Processamento ({files.length} arquivos)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}