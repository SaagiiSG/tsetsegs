import { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { authInputClasses } from '@/components/auth/AuthSplitLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { educatorApplicationSchema } from '@/lib/educatorApplications';
import { appendSource } from '@/lib/educatorLanding';
export function EducatorRequestForm({ text, source }: { text: (mn: string, en: string) => string; source: string | null }) {
 const [sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [form,setForm]=useState({name:'',institution:'',email:'',phone:'',country:'',students:'',message:'',website:''});
 const submit=async(event:React.FormEvent)=>{
  event.preventDefault();setError('');const parsed=educatorApplicationSchema.safeParse(form);
  if(!parsed.success){setError(text('Мэдээллээ шалгана уу. Шаардлагатай талбаруудыг зөв бөглөнө үү.','Please check your details and complete all required fields.'));return;}
  setBusy(true);try{const f=parsed.data;const {data:requestId,error:failure}=await supabase.rpc('submit_educator_demo_request',{_name:f.name,_institution:f.institution,_email:f.email,_phone:f.phone,_country:f.country,_students:f.students,_message:appendSource(f.message,source),_website:f.website});if(failure)throw failure;
  // Owner email alert, fire-and-forget: the request is already saved, so a failed alert must not block success.
  void supabase.functions.invoke('notify-demo-request',{body:{id:requestId}});setSent(true);}catch(e){setError(e && typeof e==='object' && 'message' in e ? String(e.message):text('Дахин оролдоно уу.','Could not send your request. Please try again.'));}finally{setBusy(false);}
 };
 const fields=[{key:'name',label:text('Таны нэр','Your name'),type:'text',max:100},{key:'institution',label:text('Сургалтын төв / байгууллага','Institution / learning center'),type:'text',max:150},{key:'email',label:text('Имэйл','Email'),type:'email',max:255},{key:'phone',label:text('Утас','Phone'),type:'tel',max:30},{key:'country',label:text('Улс','Country'),type:'text',max:100},{key:'students',label:text('Сурагчдын тоо','Number of students'),type:'number',max:6}] as const;
 if(sent) return <section className="space-y-4 py-6" role="status"><CheckCircle2 className="h-9 w-9 text-primary"/><h3 className="font-chillax text-2xl font-semibold">{text('Хүсэлт хүлээн авлаа','Request received')}</h3><p className="text-muted-foreground">{text('Манай баг тантай холбогдож уулзалтын цагийг тохирно. Эрх нь баталгаажуулалт болон төлбөрийн дараа нээгдэнэ.','We’ll contact you to set up the call. Workspace access follows approval and confirmed payment.')}</p></section>;
 return <form onSubmit={submit} className="space-y-4">{fields.map(f=><div key={f.key} className="space-y-1.5"><Label htmlFor={`educator-${f.key}`}>{f.label}</Label><Input id={`educator-${f.key}`} className={authInputClasses} type={f.type} required={f.key!=='country'} min={f.key==='students'?1:undefined} max={f.key==='students'?100000:undefined} maxLength={f.max} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}/></div>)}<div className="space-y-1.5"><Label htmlFor="educator-message">{text('Нэмэлт мэдээлэл (заавал биш)','Anything else? (optional)')}</Label><Textarea id="educator-message" maxLength={2000} value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></div><div className="hidden" aria-hidden><Label htmlFor="educator-website">Website</Label><Input id="educator-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<p className="text-xs text-muted-foreground">{text('Хүсэлтийн мэдээллийг уулзалт зохион байгуулахад ашиглана. Эрх нээхэд зөвшөөрөл болон төлбөр шаардлагатай.','We’ll use these details to set up your call. Workspace access requires approval and confirmed payment.')}</p><Button disabled={busy} type="submit" className="h-12 w-full rounded-full">{busy?text('Илгээж байна…','Sending…'):text('Уулзалт товлох','Book a call')}<ArrowRight/></Button></form>;
}
