import React from 'react';
import type { Metadata } from 'next';
import { Amiri, Satisfy, Inter } from 'next/font/google';
import '../../index.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/auth';

const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const satisfy = Satisfy({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-satisfy',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return {
    title: {
      default: t('title'),
      template: `%s | Aafiya`
    },
    description: t('description'),
    keywords: ['Aafiya', 'Healthcare', 'Doctor Booking', 'Algeria', 'EHR', 'EMR', 'Medical Appointments'],
    authors: [{ name: 'Aafiya Engineering Team' }],
    metadataBase: new URL(cleanBaseUrl),
    alternates: {
      canonical: `${cleanBaseUrl}/${locale}`,
      languages: {
        'ar': `${cleanBaseUrl}/ar`,
        'en': `${cleanBaseUrl}/en`,
        'fr': `${cleanBaseUrl}/fr`,
        'x-default': `${cleanBaseUrl}/ar`,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `${cleanBaseUrl}/${locale}`,
      siteName: 'Aafiya',
      type: 'website',
      locale: locale === 'ar' ? 'ar_DZ' : locale === 'fr' ? 'fr_FR' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  const isRtl = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    'name': 'Aafiya',
    'url': cleanBaseUrl,
    'description': t('description'),
    'address': {
      '@type': 'PostalAddress',
      'addressCountry': 'DZ'
    }
  };

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className={`${amiri.variable} ${satisfy.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${isRtl ? amiri.className : inter.className} bg-slate-50 text-slate-900 antialiased selection:bg-teal-500 selection:text-white`} suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
