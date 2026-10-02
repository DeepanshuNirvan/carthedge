import { useState } from 'react';
import { FileUp } from 'lucide-react';
import type { ProductInput } from '@/api/types';
import { useProductMutations } from '@/api/products';
import { toast } from '@/store/ui';
import { rupeesToPaise } from '@/lib/money';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { Table, Td, Th, Tr } from '@/ui/Table';

type Row = { input: ProductInput | null; raw: string; error?: string };

// CSV columns: name, category, price(₹), resellerPrice(₹), comparePrice(₹), sku, description, inStock
function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]?.toLowerCase() ?? '';
  const startAt = header.includes('name') ? 1 : 0;
  return lines.slice(startAt).filter(Boolean).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const [name, category = '', price = '', resellerPrice = '', comparePrice = '', sku = '', description = '', inStock = 'true'] = cols;
    if (!name) return { raw: line, input: null, error: 'Missing name' };
    const pricePaise = rupeesToPaise(price);
    if (pricePaise === null || pricePaise === 0) return { raw: line, input: null, error: 'Bad price' };
    return {
      raw: line,
      input: {
        name,
        category,
        price: pricePaise,
        resellerPrice: rupeesToPaise(resellerPrice) ?? 0,
        comparePrice: rupeesToPaise(comparePrice) ?? 0,
        sku,
        description,
        images: [],
        inStock: inStock.toLowerCase() !== 'false',
        trending: false,
        variants: [],
      },
    };
  });
}

export function BulkImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const { bulkImport } = useProductMutations();
  const valid = rows.filter((r) => r.input).map((r) => r.input!) ?? [];

  const onFile = async (file: File) => {
    const text = await file.text();
    if (file.name.endsWith('.json')) {
      try {
        const arr = JSON.parse(text) as ProductInput[];
        setRows(arr.map((input) => ({ input, raw: input.name })));
      } catch {
        toast('error', 'Invalid JSON', 'Expected an array of products.');
      }
    } else {
      setRows(parseCsv(text));
    }
  };

  const doImport = () => {
    bulkImport.mutate(valid, {
      onSuccess: (res) => {
        toast('success', `${res.created} products imported`);
        setRows([]);
        onClose();
      },
      onError: (e) => toast('error', 'Import failed', e.message),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Bulk import" wide>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-[rgb(var(--field)/0.03)] p-8 text-center text-sm text-mid transition-colors hover:border-jade-500 hover:bg-jade-500/5 hover:text-jade-ink">
        <FileUp className="size-6" />
        Drop a CSV or JSON file, or click to choose
        <span className="text-xs text-low">CSV columns: name, category, price₹, resellerPrice₹, comparePrice₹, sku, description, inStock</span>
        <input
          type="file"
          accept=".csv,.json"
          hidden
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      {rows.length > 0 && (
        <>
          <div className="mt-5 max-h-72 overflow-y-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Row</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <Tr key={i}>
                    <Td className="max-w-96 truncate font-mono text-xs">{r.raw}</Td>
                    <Td>
                      {r.error ? (
                        <span className="text-xs font-medium text-danger-ink">{r.error}</span>
                      ) : (
                        <span className="text-xs font-medium text-jade-ink">Ready</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={doImport} disabled={valid.length === 0} loading={bulkImport.isPending}>
              Import {valid.length} product{valid.length !== 1 && 's'}
            </Button>
            {rows.length !== valid.length && (
              <p className="text-xs text-danger-ink">{rows.length - valid.length} rows have errors and will be skipped.</p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
