import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import type { Product, ProductInput } from '@/api/types';
import { useProductMutations } from '@/api/products';
import { toast } from '@/store/ui';
import { rupeesToPaise, paiseToRupees } from '@/lib/money';
import { Modal } from '@/ui/Modal';
import { Field, Input, Textarea } from '@/ui/Input';
import { Button, IconButton } from '@/ui/Button';
import { Switch } from '@/ui/Switch';
import { FileDropzone } from '@/ui/FileDropzone';

const rupees = (msg: string) =>
  z.string().refine((s) => s === '' || rupeesToPaise(s) !== null, msg);

const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string(),
  category: z.string().min(1, 'Category helps buyers filter'),
  price: rupees('Enter a valid price').refine((s) => s !== '', 'Price is required'),
  resellerPrice: rupees('Enter a valid price'),
  comparePrice: rupees('Enter a valid price'),
  sku: z.string(),
  images: z.array(z.string()),
  inStock: z.boolean(),
  trending: z.boolean(),
  variants: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, 'Variant name required'),
      price: rupees('Invalid price'),
      sku: z.string(),
      inStock: z.boolean(),
    }),
  ),
});
type ProductFormValues = z.infer<typeof productSchema>;

const toInput = (v: ProductFormValues): ProductInput => ({
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
  variants: v.variants.map((va) => ({
    id: va.id || undefined,
    name: va.name,
    price: va.price ? (rupeesToPaise(va.price) ?? 0) : 0,
    sku: va.sku,
    inStock: va.inStock,
  })),
});

export function ProductForm({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Product | null }) {
  const { create, update } = useProductMutations();
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
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
          variants: (editing.variants ?? []).map((v) => ({
            id: v.id,
            name: v.name,
            price: v.price ? paiseToRupees(v.price) : '',
            sku: v.sku,
            inStock: v.inStock,
          })),
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
          variants: [],
        },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const images = watch('images');
  const inStock = watch('inStock');
  const trending = watch('trending');

  const onSubmit = (values: ProductFormValues) => {
    const input = toInput(values);
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
        <Field label="Category" error={errors.category?.message}>
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
              onClick={() => append({ name: '', price: '', sku: '', inStock: true })}
            >
              Add variant
            </Button>
          </div>
          {fields.length === 0 ? (
            <p className="text-xs text-low">No variants — sizes and colors go here (e.g. “M”, “Red / L”).</p>
          ) : (
            <div className="flex flex-col gap-2">
              {fields.map((f, i) => (
                <div
                  key={f.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2 sm:grid-cols-[1fr_90px_90px_auto_auto]"
                >
                  <Input
                    placeholder="M / Red"
                    aria-label="Variant name"
                    className="col-span-4 sm:col-span-1"
                    {...register(`variants.${i}.name`)}
                  />
                  <Input placeholder="₹ same" aria-label="Variant price" inputMode="decimal" {...register(`variants.${i}.price`)} />
                  <Input placeholder="SKU" aria-label="Variant SKU" {...register(`variants.${i}.sku`)} />
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
          {errors.variants && <p className="mt-1 text-xs text-danger">Check variant names and prices.</p>}
        </div>

        <div className="flex items-center gap-6 sm:col-span-2">
          <span className="flex items-center gap-2.5 text-sm text-hi">
            <Switch checked={inStock} onChange={(v) => setValue('inStock', v)} label="In stock" />
            In stock
          </span>
          <span className="flex items-center gap-2.5 text-sm text-hi">
            <Switch checked={trending} onChange={(v) => setValue('trending', v)} label="Trending" />
            Trending
          </span>
        </div>

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
