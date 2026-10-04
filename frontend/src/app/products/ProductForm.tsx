import { useEffect, useState } from 'react';
import { useFieldArray, useForm, type FieldNamesMarkedBoolean } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { gstRates, type Product, type ProductInput } from '@/api/types';
import { useProductMutations } from '@/api/products';
import { useBusiness } from '@/api/business';
import { uploadFile } from '@/api/uploads';
import { toast } from '@/store/ui';
import { rupeesToPaise, paiseToRupees } from '@/lib/money';
import { Modal } from '@/ui/Modal';
import { Field, Input, Select, Textarea } from '@/ui/Input';
import { Button, IconButton } from '@/ui/Button';
import { Switch } from '@/ui/Switch';
import { FileDropzone } from '@/ui/FileDropzone';
import { checkOptions, emptyOptions, optionsFrom, optionsInput, OptionsEditor, type OptionsState } from './OptionsEditor';

/** Room for a few photos of every colour as well as the general shots. */
const MAX_PHOTOS = 12;

const rupees = (msg: string) =>
  z.string().refine((s) => s === '' || rupeesToPaise(s) !== null, msg);
// empty = not counted (the in-stock switch alone decides)
const count = z.string().refine((s) => s === '' || /^\d{1,6}$/.test(s), 'Whole number, or empty');
const qtyOf = (s: string) => (s === '' ? -1 : Number(s));
const qtyText = (n: number | undefined) => (n === undefined || n < 0 ? '' : String(n));

const productSchema = z
  .object({
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
    details: z.array(z.object({ label: z.string().max(40), value: z.string().max(300) })),
    sizeChart: z.string(),
    hsn: z.string().refine((s) => s === '' || /^\d{4}(\d{2}){0,2}$/.test(s), '4, 6 or 8 digits'),
    gstRate: z.string(),
    mrp: rupees('Enter a valid MRP'),
    originCountry: z.string().trim().max(60, 'Keep it under 60 characters'),
    manufacturer: z.string().trim().max(300, 'Keep it under 300 characters'),
  })
  // selling above the printed maximum retail price is not allowed
  .refine((v) => !v.mrp || (rupeesToPaise(v.price) ?? 0) <= (rupeesToPaise(v.mrp) ?? 0), {
    path: ['mrp'],
    message: "The price can't be more than the MRP",
  });
type ProductFormValues = z.infer<typeof productSchema>;
type Dirty = Partial<Readonly<FieldNamesMarkedBoolean<ProductFormValues>>>;

/**
 * Stock is sent on an edit only when the seller changed it: orders draw it down
 * while the form is open, and resending the old number would undo those sales.
 */
const toInput = (v: ProductFormValues, dirty: Dirty | null, options: OptionsState, editing: Product | null): ProductInput => ({
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
  ...optionsInput(options, v.images, editing),
  details: v.details.filter((d) => d.label.trim() || d.value.trim()),
  sizeChart: v.sizeChart,
  hsn: v.hsn,
  gstRate: v.gstRate === '' ? -1 : Number(v.gstRate),
  mrp: v.mrp ? (rupeesToPaise(v.mrp) ?? 0) : 0,
  originCountry: v.originCountry,
  manufacturer: v.manufacturer,
});

const countries = ['India', 'China', 'Bangladesh', 'Vietnam', 'Sri Lanka', 'Nepal', 'Thailand', 'Indonesia', 'Turkey', 'Italy'];

export function ProductForm({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Product | null }) {
  const { create, update } = useProductMutations();
  const { data: business } = useBusiness();
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
          details: editing.details ?? [],
          sizeChart: editing.sizeChart ?? '',
          hsn: editing.hsn ?? '',
          gstRate: editing.gstRate >= 0 ? String(editing.gstRate) : '',
          mrp: editing.mrp ? paiseToRupees(editing.mrp) : '',
          originCountry: editing.originCountry ?? '',
          manufacturer: editing.manufacturer ?? '',
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
          details: [],
          sizeChart: '',
          hsn: '',
          gstRate: '',
          mrp: '',
          originCountry: '',
          manufacturer: '',
        },
  });
  const details = useFieldArray({ control, name: 'details' });
  const images = watch('images');
  const inStock = watch('inStock');
  const trending = watch('trending');
  const sizeChart = watch('sizeChart');
  const [uploadingChart, setUploadingChart] = useState(false);
  const [options, setOptions] = useState<OptionsState>(emptyOptions);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // the option editor starts from the product being edited, fresh each time the form opens
  useEffect(() => {
    if (open) {
      setOptions(optionsFrom(editing));
      setOptionsError(null);
    }
  }, [open, editing]);

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

  const fillFromBusiness = () => {
    if (!business) return;
    const place = [business.address, business.city, business.state, business.pincode].filter(Boolean).join(', ');
    setValue('manufacturer', [business.name, place].filter(Boolean).join(', '), { shouldDirty: true });
  };

  const onSubmit = (values: ProductFormValues) => {
    const optionsProblem = checkOptions(options, values.mrp ? rupeesToPaise(values.mrp) : null);
    setOptionsError(optionsProblem);
    if (optionsProblem) return;
    const input = toInput(values, editing ? dirtyFields : null, options, editing);
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
          <FileDropzone images={images} max={MAX_PHOTOS} onChange={(imgs) => setValue('images', imgs, { shouldDirty: true })} />
        </div>

        <OptionsEditor
          state={options}
          onChange={(next) => {
            setOptions(next);
            if (optionsError) setOptionsError(null);
          }}
          gallery={images}
          onGallery={(imgs) => setValue('images', imgs, { shouldDirty: true })}
          maxGallery={MAX_PHOTOS}
          basePrice={watch('price')}
          error={optionsError}
        />

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

        {/* label details: what India's e-commerce and packaged-goods rules ask a listing to show */}
        <div className="border-t pt-4 sm:col-span-2">
          <p className="text-sm font-medium text-hi">Label details</p>
          <p className="mt-0.5 text-xs text-low">What a product label states. Buyers see these on the product page; fill in what applies.</p>
        </div>
        <Field label="MRP (₹)" optional error={errors.mrp?.message} hint="Inclusive of all taxes. Your price can't be above it.">
          <Input inputMode="decimal" placeholder="1999" {...register('mrp')} />
        </Field>
        <Field label="Country of origin" optional error={errors.originCountry?.message}>
          <Input list="origin-countries" placeholder="India" maxLength={60} {...register('originCountry')} />
        </Field>
        <datalist id="origin-countries">
          {countries.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="sm:col-span-2">
          <Field
            label="Made or packed by"
            optional
            error={errors.manufacturer?.message}
            hint="Name and address of the maker, packer or importer"
          >
            <Textarea rows={2} maxLength={300} placeholder="Rangrez Handlooms, 12 Johari Bazaar, Jaipur, Rajasthan 302003" {...register('manufacturer')} />
          </Field>
          {business?.address && (
            <Button type="button" variant="ghost" size="sm" className="mt-1.5" icon={<Building2 className="size-4" />} onClick={fillFromBusiness}>
              Use my business address
            </Button>
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
