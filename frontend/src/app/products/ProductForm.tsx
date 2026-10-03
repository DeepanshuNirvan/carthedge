import { useState } from 'react';
import { useFieldArray, useForm, type FieldNamesMarkedBoolean } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { gstRates, type Product, type ProductInput } from '@/api/types';
import { useProductMutations } from '@/api/products';
import { uploadFile } from '@/api/uploads';
import { toast } from '@/store/ui';
import { rupeesToPaise, paiseToRupees } from '@/lib/money';
import { Modal } from '@/ui/Modal';
import { Field, Input, Select, Textarea } from '@/ui/Input';
import { Button, IconButton } from '@/ui/Button';
import { Switch } from '@/ui/Switch';
import { FileDropzone } from '@/ui/FileDropzone';

const rupees = (msg: string) =>
  z.string().refine((s) => s === '' || rupeesToPaise(s) !== null, msg);
// empty = not counted (the in-stock switch alone decides)
const count = z.string().refine((s) => s === '' || /^\d{1,6}$/.test(s), 'Whole number, or empty');
const qtyOf = (s: string) => (s === '' ? -1 : Number(s));
const qtyText = (n: number | undefined) => (n === undefined || n < 0 ? '' : String(n));

const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string(),
  category: z.string().trim().max(60, 'Keep the category short'),
  price: rupees('Enter a valid price').refine((s) => s !== '', 'Price is required'),
  resellerPrice: rupees('Enter a valid price'),
  comparePrice: rupees('Enter a valid price'),
  sku: z.string(),
  images: z.array(z.string()),
  inStock: z.boolean(),
  trending: z.boolean(),
  stockQty: count,
  variants: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, 'Variant name required'),
      price: rupees('Invalid price'),
      sku: z.string(),
      inStock: z.boolean(),
      stockQty: count,
    }),
  ),
  details: z.array(z.object({ label: z.string().max(40), value: z.string().max(300) })),
  sizeChart: z.string(),
  hsn: z.string().refine((s) => s === '' || /^\d{4}(\d{2}){0,2}$/.test(s), '4, 6 or 8 digits'),
  gstRate: z.string(),
});
type ProductFormValues = z.infer<typeof productSchema>;
type Dirty = Partial<Readonly<FieldNamesMarkedBoolean<ProductFormValues>>>;

/**
 * Stock is sent on an edit only when the seller changed it: orders draw it down
 * while the form is open, and resending the old number would undo those sales.
 */
const toInput = (v: ProductFormValues, dirty: Dirty | null): ProductInput => ({
  name: v.name,
  description: v.description,
  category: v.category,
  price: rupeesToPaise(v.price) ?? 0,
  resellerPrice: v.resellerPrice ? (rupeesToPaise(v.resellerPrice) ?? 0) : 0,
  comparePrice: v.comparePrice ? (rupeesToPaise(v.comparePrice) ?? 0) : 0,
  sku: v.sku,
  images: v.images,
  inStock: v.inStock,
  trending: v.trending,
  stockQty: !dirty || dirty.stockQty ? qtyOf(v.stockQty) : undefined,
  variants: v.variants.map((va, i) => ({
    id: va.id || undefined,
    name: va.name,
    price: va.price ? (rupeesToPaise(va.price) ?? 0) : 0,
    sku: va.sku,
    inStock: va.inStock,
    stockQty: !dirty || !va.id || dirty.variants?.[i]?.stockQty ? qtyOf(va.stockQty) : undefined,
  })),
  details: v.details.filter((d) => d.label.trim() || d.value.trim()),
  sizeChart: v.sizeChart,
  hsn: v.hsn,
  gstRate: v.gstRate === '' ? -1 : Number(v.gstRate),
});

export function ProductForm({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Product | null }) {
  const { create, update } = useProductMutations();
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    values: editing
      ? {
          name: editing.name,
          description: editing.description,
          category: editing.category,
          price: paiseToRupees(editing.price),
          resellerPrice: editing.resellerPrice ? paiseToRupees(editing.resellerPrice) : '',
          comparePrice: editing.comparePrice ? paiseToRupees(editing.comparePrice) : '',
          sku: editing.sku,
          images: editing.images ?? [],
          inStock: editing.inStock,
          trending: editing.trending,
          stockQty: qtyText(editing.stockQty),
          variants: (editing.variants ?? []).map((v) => ({
            id: v.id,
            name: v.name,
            price: v.price ? paiseToRupees(v.price) : '',
            sku: v.sku,
            inStock: v.inStock,
            stockQty: qtyText(v.stockQty),
          })),
          details: editing.details ?? [],
          sizeChart: editing.sizeChart ?? '',
          hsn: editing.hsn ?? '',
          gstRate: editing.gstRate >= 0 ? String(editing.gstRate) : '',
        }
      : {
          name: '',
          description: '',
          category: '',
          price: '',
          resellerPrice: '',
          comparePrice: '',
          sku: '',
          images: [],
          inStock: true,
          trending: false,
          stockQty: '',
          variants: [],
          details: [],
          sizeChart: '',
          hsn: '',
          gstRate: '',
        },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const details = useFieldArray({ control, name: 'details' });
  const images = watch('images');
  const inStock = watch('inStock');
  const trending = watch('trending');
  const sizeChart = watch('sizeChart');
  const [uploadingChart, setUploadingChart] = useState(false);

  const onChart = async (file: File) => {
    setUploadingChart(true);
    try {
      setValue('sizeChart', await uploadFile(file), { shouldDirty: true });
    } catch (e) {
      toast('error', 'Size chart not uploaded', e instanceof Error ? e.message : undefined);
    } finally {
      setUploadingChart(false);
    }
  };

  const onSubmit = (values: ProductFormValues) => {
    const input = toInput(values, editing ? dirtyFields : null);
    const mutation = editing ? update : create;
    const payload = editing ? { id: editing.id, input } : input;
    // both mutations share success/error handling
    (mutation.mutate as (p: unknown, o: object) => void)(payload, {
      onSuccess: () => {
        toast('success', editing ? 'Product updated' : 'Product added');
        onClose();
      },
      onError: (e: Error) => toast('error', 'Could not save product', e.message),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit product' : 'Add product'} wide>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Field label="Name" error={errors.name?.message}>
            <Input placeholder="Rose Pink Chikankari Kurti" {...register('name')} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description" optional>
            <Textarea rows={3} {...register('description')} />
          </Field>
        </div>
        <Field label="Category" optional hint="Helps buyers filter your store" error={errors.category?.message}>
          <Input placeholder="Kurtis" {...register('category')} />
        </Field>
        <Field label="SKU" optional>
          <Input {...register('sku')} />
        </Field>
        <Field label="Price (₹)" error={errors.price?.message}>
          <Input inputMode="decimal" placeholder="1499" {...register('price')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Reseller ₹" optional error={errors.resellerPrice?.message}>
            <Input inputMode="decimal" {...register('resellerPrice')} />
          </Field>
          <Field label="Compare-at ₹" optional error={errors.comparePrice?.message}>
            <Input inputMode="decimal" {...register('comparePrice')} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-hi">Images</p>
          <FileDropzone images={images} onChange={(imgs) => setValue('images', imgs)} />
        </div>

        {/* variants builder */}
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-hi">Variants</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={() => append({ name: '', price: '', sku: '', inStock: true, stockQty: '' })}
            >
              Add variant
            </Button>
          </div>
          {fields.length === 0 ? (
            <p className="text-xs text-low">No variants, sizes and colors go here (e.g. “M”, “Red / L”).</p>
          ) : (
            <div className="flex flex-col gap-2">
              {fields.map((f, i) => (
                <div
                  key={f.id}
                  className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-2 sm:grid-cols-[1fr_90px_90px_80px_auto_auto]"
                >
                  <Input
                    placeholder="M / Red"
                    aria-label="Variant name"
                    className="col-span-5 sm:col-span-1"
                    {...register(`variants.${i}.name`)}
                  />
                  <Input placeholder="₹ same" aria-label="Variant price" inputMode="decimal" {...register(`variants.${i}.price`)} />
                  <Input placeholder="SKU" aria-label="Variant SKU" {...register(`variants.${i}.sku`)} />
                  <Input placeholder="Qty" aria-label="Variant stock count (empty = not counted)" inputMode="numeric" {...register(`variants.${i}.stockQty`)} />
                  <Switch
                    checked={watch(`variants.${i}.inStock`)}
                    onChange={(v) => setValue(`variants.${i}.inStock`, v)}
                    label="In stock"
                  />
                  <IconButton label="Remove variant" onClick={() => remove(i)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
          {errors.variants && <p className="mt-1 text-xs text-danger-ink">Check variant names, prices and counts.</p>}
          {fields.length > 0 && (
            <p className="mt-1.5 text-xs text-low">Qty is the count you have of that option; orders draw it down. Empty means not counted.</p>
          )}
        </div>

        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[auto_1fr] sm:items-end">
          <div className="flex items-center gap-6 sm:pb-2.5">
            <span className="flex items-center gap-2.5 text-sm text-hi">
              <Switch checked={inStock} onChange={(v) => setValue('inStock', v, { shouldDirty: true })} label="In stock" />
              In stock
            </span>
            <span className="flex items-center gap-2.5 text-sm text-hi">
              <Switch checked={trending} onChange={(v) => setValue('trending', v, { shouldDirty: true })} label="Trending" />
              Trending
            </span>
          </div>
          <Field
            label="Pieces in stock"
            optional
            error={errors.stockQty?.message}
            hint="Orders reduce it and it shows sold out at 0. Leave empty to manage with the switch."
          >
            <Input inputMode="numeric" placeholder="Not counted" className="sm:max-w-48" {...register('stockQty')} />
          </Field>
        </div>

        {/* what buyers ask before they buy; the assistant quotes these too */}
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-hi">Details</p>
            {details.fields.length < 20 && (
              <Button type="button" variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => details.append({ label: '', value: '' })}>
                Add detail
              </Button>
            )}
          </div>
          {details.fields.length === 0 ? (
            <p className="text-xs text-low">Fabric, fit, length, care, what is in the box. Buyers see them on the product page.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {details.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-2">
                  <Input placeholder="Fabric" aria-label="Detail label" maxLength={40} {...register(`details.${i}.label`)} />
                  <Input placeholder="Pure cotton, hand block print" aria-label="Detail value" maxLength={300} {...register(`details.${i}.value`)} />
                  <IconButton label="Remove detail" onClick={() => details.remove(i)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <p className="text-sm font-medium text-hi">Size chart</p>
          {sizeChart ? (
            <div className="flex items-center gap-3">
              <img src={sizeChart} alt="Size chart" className="h-20 w-28 rounded-md object-cover hairline" />
              <Button type="button" variant="ghost" size="sm" icon={<X className="size-4" />} onClick={() => setValue('sizeChart', '', { shouldDirty: true })}>
                Remove
              </Button>
            </div>
          ) : (
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-jade-ink neu">
              <ImagePlus className="size-4" /> {uploadingChart ? 'Uploading…' : 'Upload a size chart image'}
              <input type="file" accept="image/*" hidden disabled={uploadingChart} onChange={(e) => e.target.files?.[0] && onChart(e.target.files[0])} />
            </label>
          )}
        </div>

        <Field label="HSN code" optional error={errors.hsn?.message} hint="Printed on GST invoices">
          <Input inputMode="numeric" maxLength={8} placeholder="6204" {...register('hsn')} />
        </Field>
        <Field label="GST rate" hint="Store default comes from Settings → GST">
          <Select {...register('gstRate')}>
            <option value="">Store default</option>
            {gstRates.map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex gap-3 sm:col-span-2">
          <Button type="submit" loading={create.isPending || update.isPending}>
            {editing ? 'Save changes' : 'Add product'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
