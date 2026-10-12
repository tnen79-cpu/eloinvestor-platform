import {LeadWorkspace} from '@/components/LeadWorkspace';
export default async function InterestsPage({params}:{params:Promise<{country:string;lang:string}>}){const {country,lang}=await params;return <main className="container page"><LeadWorkspace country={country} lang={lang}/></main>;}
