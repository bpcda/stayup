import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GIORNI, STOPS } from "@/lib/shuttleHelpers";

interface ShuttleFiltersProps {
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  filterGiorno: string;
  setFilterGiorno: (s: string) => void;
  filterFermata: string;
  setFilterFermata: (s: string) => void;
  filterPagato: string;
  setFilterPagato: (s: string) => void;
}

export const ShuttleFilters = ({
  searchQuery, setSearchQuery, filterGiorno, setFilterGiorno,
  filterFermata, setFilterFermata, filterPagato, setFilterPagato
}: ShuttleFiltersProps) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <Label className="text-xs">Cerca (nome, email, telefono)</Label>
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Cerca iscritti..."
      />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="space-y-1">
        <Label className="text-xs">Giorno</Label>
        <Select value={filterGiorno} onValueChange={setFilterGiorno}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {GIORNI.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Fermata</Label>
        <Select value={filterFermata} onValueChange={setFilterFermata}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte</SelectItem>
            {STOPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Pagamento</Label>
        <Select value={filterPagato} onValueChange={setFilterPagato}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="pagato">Pagato</SelectItem>
            <SelectItem value="non_pagato">Non pagato</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);
