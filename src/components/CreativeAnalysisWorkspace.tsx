import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CreativeLab from './creative-lab/CreativeLab';
import CreativeSalesOverview from './creative-lab/CreativeSalesOverview';
export default function CreativeAnalysisWorkspace() {
 const [detailed, setDetailed] = useState(false);
 return <div className="space-y-4"><div className="flex gap-2"><Button variant={detailed ? 'outline' : 'default'} onClick={() => setDetailed(false)}>Anúncios e vendas</Button><Button variant={detailed ? 'default' : 'outline'} onClick={() => setDetailed(true)}>Análise detalhada</Button></div>{detailed ? <CreativeLab /> : <CreativeSalesOverview />}</div>;
}
