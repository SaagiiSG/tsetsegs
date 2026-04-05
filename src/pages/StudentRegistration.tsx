import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Loader2, Phone, User, Users, CheckCircle2, ArrowLeft, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

type Step = 'form' | 'submitted' | 'already_pending' | 'already_registered';

export default function StudentRegistration() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [parentName, setParentName] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phoneNumber.length !== 8) {
      toast({ title: 'Утасны дугаар буруу', description: '8 оронтой утасны дугаар оруулна уу', variant: 'destructive' });
      return;
    }
    if (fullName.trim().length < 2) {
      toast({ title: 'Нэрээ оруулна уу', description: 'Бүтэн нэрээ оруулна уу', variant: 'destructive' });
      return;
    }
    if (parentName.trim().length < 2) {
      toast({ title: 'Эцэг/эхийн нэр', description: 'Эцэг эсвэл эхийн нэрийг оруулна уу', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      // Check if phone already exists in students table (already registered)
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('phone', phoneNumber)
        .limit(1);

      if (existingStudent && existingStudent.length > 0) {
        setStep('already_registered');
        setIsLoading(false);
        return;
      }

      // Check if there's already a pending request
      const { data: existingRequest } = await supabase
        .from('registration_requests')
        .select('id, status')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          setStep('already_pending');
          setIsLoading(false);
          return;
        }
        if (existingRequest.status === 'rejected') {
          toast({ title: 'Хүсэлт татгалзагдсан', description: 'Таны өмнөх хүсэлт татгалзагдсан. Багштайгаа холбогдоно уу.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
      }

      // Submit new registration request
      const { error } = await supabase
        .from('registration_requests')
        .insert({
          phone_number: phoneNumber,
          full_name: fullName.trim(),
          parent_name: parentName.trim(),
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          setStep('already_pending');
        } else {
          throw error;
        }
      } else {
        setStep('submitted');
      }
    } catch (err: any) {
      console.error('Registration request error:', err);
      toast({ title: 'Алдаа гарлаа', description: 'Дахин оролдоно уу', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Бүртгүүлэх</CardTitle>
        <CardDescription className="text-center">
          Мэдээллээ оруулаад хүсэлт илгээнэ үү. Багш таны хүсэлтийг шалгаж баталгаажуулна.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Бүтэн нэр</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                placeholder="Таны бүтэн нэр"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10"
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Утасны дугаар</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="99112233"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="pl-10 text-lg tracking-wider"
                maxLength={8}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Энэ дугаараар нэвтрэх болно
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentName">Эцэг/эхийн нэр</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="parentName"
                type="text"
                placeholder="Эцэг эсвэл эхийн нэр"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="pl-10"
                maxLength={100}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isLoading || phoneNumber.length !== 8 || fullName.trim().length < 2 || parentName.trim().length < 2}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Илгээж байна...
              </>
            ) : (
              'Хүсэлт илгээх'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/practice" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Нэвтрэх хуудас руу буцах
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  const renderSubmitted = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Хүсэлт илгээгдлээ!</CardTitle>
        <CardDescription>
          Таны бүртгэлийн хүсэлт амжилттай илгээгдлээ. Багш шалгаж баталгаажуулсны дараа нэвтрэх боломжтой болно.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-center">
          <p className="text-sm text-muted-foreground">Нэр: <span className="font-medium text-foreground">{fullName}</span></p>
          <p className="text-sm text-muted-foreground">Утас: <span className="font-mono font-medium text-foreground">{phoneNumber}</span></p>
        </div>
        <Link to="/practice">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Нэвтрэх хуудас руу буцах
          </Button>
        </Link>
      </CardContent>
    </Card>
  );

  const renderAlreadyPending = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Хүсэлт хүлээгдэж байна</CardTitle>
        <CardDescription>
          Энэ дугаараар хүсэлт аль хэдийн илгээгдсэн байна. Багш шалгаж баталгаажуулахыг хүлээнэ үү.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link to="/practice">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Нэвтрэх хуудас руу буцах
          </Button>
        </Link>
      </CardContent>
    </Card>
  );

  const renderAlreadyRegistered = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Бүртгэлтэй байна</CardTitle>
        <CardDescription>
          Энэ дугаар аль хэдийн бүртгэгдсэн байна. Шууд нэвтрэх боломжтой.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link to="/practice">
          <Button className="w-full">
            Нэвтрэх
          </Button>
        </Link>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">SAT Practice</h1>
          <p className="text-muted-foreground text-sm">Шинэ сурагч бүртгүүлэх</p>
        </div>

        {step === 'form' && renderForm()}
        {step === 'submitted' && renderSubmitted()}
        {step === 'already_pending' && renderAlreadyPending()}
        {step === 'already_registered' && renderAlreadyRegistered()}
      </div>
    </div>
  );
}
