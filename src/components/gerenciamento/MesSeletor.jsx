import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MesSeletor({ mesAtual, onChange }) {
  const date = parseISO(mesAtual + "-01");

  const anterior = () => onChange(format(subMonths(date, 1), "yyyy-MM"));
  const proximo = () => onChange(format(addMonths(date, 1), "yyyy-MM"));

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={anterior}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-lg font-semibold min-w-[140px] text-center capitalize">
        {format(date, "MMMM yyyy", { locale: ptBR })}
      </span>
      <Button variant="outline" size="icon" onClick={proximo}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}