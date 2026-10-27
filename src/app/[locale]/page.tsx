import { setRequestLocale } from 'next-intl/server';
import { HomePage } from './home/HomePage';
import { buildDemoScenario } from '@/lib/demo/scenario';

// The engines are deterministic, so one run per server process backs every locale render.
const scenario = buildDemoScenario();

export default async function HomepageRoute({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomePage scenario={scenario} />;
}
