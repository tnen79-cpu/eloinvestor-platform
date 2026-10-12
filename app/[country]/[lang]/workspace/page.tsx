import { InvestorWorkspace } from '@/components/InvestorWorkspace';
export default async function WorkspacePage({params}:{params:Promise<{country:string;lang:string}>}){const {country,lang}=await params;return <main className="container page"><InvestorWorkspace country={country} lang={lang}/></main>;}
