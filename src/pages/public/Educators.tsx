import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap, LayoutDashboard, Users } from 'lucide-react';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { EducatorRequestForm } from '@/components/educators/EducatorRequestForm';
import { Button } from '@/components/ui/button';
import { usePublicLanguage } from '@/hooks/usePublicLanguage';
import { sourceFromSearch } from '@/lib/educatorLanding';
import { TIER_ASSETS } from '@/components/student/leaderboard/tierAssets';
export default function Educators(){
 const {lang,text}=usePublicLanguage();
 return <AuthSplitLayout headline="Educators"><div className="space-y-8">
  <div><span className="lv-blue inline-flex rounded-full px-3 py-1 text-sm"><GraduationCap className="mr-2 h-4 w-4"/>{text('Багш, сургалтын төвүүдэд','For educators & learning centers')}</span><h1 className="mt-5 font-chillax text-4xl font-semibold">{text('Танай сурагчид. Нэг орчин.','Your students. One workspace.')}</h1><p className="mt-4 text-muted-foreground">{text('Анги, сурагчдын ахиц, SAT таамаглал — танай төвийн тусдаа орчинд.','Classes, student progress and SAT predictions in your center’s own workspace.')}</p></div>
  <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Button variant="outline" asChild className="h-12 rounded-full"><Link to={`/login?role=admin&lang=${lang}`}>{text('Админ нэвтрэх','Admin sign in')}</Link></Button><Button variant="outline" asChild className="h-12 rounded-full"><Link to={`/login?role=teacher&lang=${lang}`}>{text('Багш нэвтрэх','Teacher sign in')}</Link></Button></div><p className="text-xs text-muted-foreground">{text('Төвийн бүртгэлтэй хэрэглэгчид өөрийн төвийн хаягаар нэвтэрнэ.','Existing center accounts sign in at their own center’s address.')}</p></div>
  <EducatorRequestForm text={text} source={sourceFromSearch(window.location.search)}/>
  <section className="space-y-3"><h2 className="font-chillax text-xl font-semibold">{text('Демо үзэх','See demo')}</h2>{([{role:'admin',icon:LayoutDashboard,label:text('Админ','Admin'),sub:text('Анги, баг, сурагчид','Classes, team & students')},{role:'teacher',icon:Users,label:text('Багш','Teacher'),sub:text('Ирц, ангийн ахиц','Attendance & class progress')},{role:'student',icon:GraduationCap,label:text('Сурагч','Student'),sub:text('Дасгал, SAT таамаглал, лиг','Practice, SAT prediction & ranks')}] as const).map(r=><a key={r.role} href={`/demo?role=${r.role}&preview=educator&lang=${lang}`} className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-muted"><r.icon className="h-5 w-5 text-muted-foreground"/><div className="flex-1"><p className="font-medium">{r.label}</p><p className="text-xs text-muted-foreground">{r.sub}</p></div>{r.role==='student' && <img src={TIER_ASSETS.diamond.image} alt="" className="h-9 w-9 object-contain"/>}<ArrowRight className="h-4 w-4"/></a>)}</section>
 </div></AuthSplitLayout>;
}
