import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Mail } from 'lucide-react';
import { Seo } from '@/lib/seo';
import { contact } from '@/strings/marketing';
import { emailSchema, phoneSchema } from '@/lib/validators';
import { useSite } from '@/api/site';
import { MarketingBackground } from '../MarketingBackground';
import { MarketingNav } from '../MarketingNav';
import { Footer } from '../Footer';
import { Field, Input, Textarea } from '@/ui/Input';
import { Button } from '@/ui/Button';

const contactSchema = z.object({
  name: z.string().min(2, 'Your name helps us reply personally'),
  business: z.string().min(2, 'Business name is required'),
  email: emailSchema,
  phone: phoneSchema,
  message: z.string().min(12, 'A little more detail helps us help you'),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const { data: site } = useSite();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactForm>({ resolver: zodResolver(contactSchema) });

  // no public contact endpoint yet — deliver via mailto with a prefilled body
  const onSubmit = (data: ContactForm) => {
    const to = site?.contact.email || 'hello@carthedge.in';
    const body = encodeURIComponent(
      `Name: ${data.name}\nBusiness: ${data.business}\nPhone: ${data.phone}\n\n${data.message}`,
    );
    location.href = `mailto:${to}?subject=${encodeURIComponent(`CartHedge enquiry — ${data.business}`)}&body=${body}`;
    setSent(true);
  };

  return (
    <div>
      <Seo
        title="Contact CartHedge — Talk to a human"
        description="Questions about CartHedge plans, migrations or custom volume pricing? We reply within a working day."
        path="/contact"
      />
      <MarketingBackground />
      <MarketingNav />
      <main className="mx-auto grid min-h-dvh w-full max-w-6xl gap-12 px-5 pb-24 pt-36 sm:px-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h1 className="font-display text-d2 font-semibold text-hi">{contact.title}</h1>
          <p className="mt-3 max-w-md text-mid">{contact.sub}</p>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass sheen mt-10 flex items-center gap-3 rounded-2xl p-5 text-jade-400 shadow-float"
            >
              <CheckCircle2 className="size-6 shrink-0" />
              <p className="text-sm font-medium">{contact.form.success}</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-10 grid gap-5 sm:grid-cols-2" noValidate>
              <Field label={contact.form.name} error={errors.name?.message}>
                <Input {...register('name')} autoComplete="name" />
              </Field>
              <Field label={contact.form.business} error={errors.business?.message}>
                <Input {...register('business')} autoComplete="organization" />
              </Field>
              <Field label={contact.form.email} error={errors.email?.message}>
                <Input type="email" {...register('email')} autoComplete="email" />
              </Field>
              <Field label={contact.form.phone} error={errors.phone?.message}>
                <Input type="tel" {...register('phone')} autoComplete="tel" />
              </Field>
              <div className="sm:col-span-2">
                <Field label={contact.form.message} error={errors.message?.message}>
                  <Textarea rows={5} {...register('message')} />
                </Field>
              </div>
              <Button type="submit" size="lg" className="sm:col-span-2 sm:justify-self-start">
                {contact.form.submit}
              </Button>
            </form>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:pt-16">
          <div className="glass sheen rounded-2xl p-6 shadow-float transition-transform duration-std ease-enter hover:-translate-y-1">
            <Mail className="size-5 text-jade-500" aria-hidden />
            <p className="mt-3 text-sm font-medium text-hi">{site?.contact.email || 'hello@carthedge.in'}</p>
            <p className="mt-1 text-xs text-low">Best for detailed questions</p>
          </div>
          <div className="glass sheen rounded-2xl p-6 shadow-float transition-transform duration-std ease-enter hover:-translate-y-1">
            <Clock className="size-5 text-gold-400" aria-hidden />
            <p className="mt-3 text-sm font-medium text-hi">{site?.contact.supportHours}</p>
            <p className="mt-1 text-xs text-low">We reply within a working day</p>
          </div>
          <div
            aria-hidden
            className="hidden flex-1 rounded-lg bg-[radial-gradient(circle_at_30%_30%,rgb(var(--jade-500)/0.15),transparent_60%),radial-gradient(circle_at_70%_70%,rgb(var(--gold-400)/0.12),transparent_55%)] lg:block"
          />
        </aside>
      </main>
      <Footer />
    </div>
  );
}
