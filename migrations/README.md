# Migrations

Cartella che contiene tutte le modifiche di **schema** del database (dev e prod).

## Convenzione
- Nome file: `YYYYMMDD_descrizione_breve.sql`
- Ogni migration deve essere **idempotente** (`if not exists`, `drop policy if exists`, ecc.) così può essere rieseguita senza rompere nulla.
- Solo modifiche di **struttura** (tabelle, colonne, policy, indici, trigger, funzioni). I dati si gestiscono separatamente.

## Come applicarle
1. Apri il **SQL Editor** del progetto Supabase (dev o prod a seconda del branch).
2. Incolla il contenuto del file `.sql` da applicare.
3. Esegui.
4. Comunica all'AI che la migration è stata applicata, così il frontend può essere allineato.

## Ordine
Applicare in ordine cronologico (lo prefisso data nel filename garantisce l'ordinamento alfabetico).
