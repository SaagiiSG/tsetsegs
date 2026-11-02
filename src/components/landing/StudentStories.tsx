import { BrandMark } from "@/components/BrandMark";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import ganbayar from "@/assets/students/ganbayar.webp";
import tsengeg from "@/assets/students/tsengeg.webp";
import tengis from "@/assets/students/tengis.webp";
import gegee from "@/assets/students/gegee.webp";
import nyamsambuu from "@/assets/students/nyamsambuu.webp";

type T = (mn: string, en: string) => string;

// Sent by Misheel on 2 Nov 2026 with the students' consent. Quotes are the students' own words;
// the English or Mongolian side is our translation. Gegee's and Nyamsambuu's were drafted by us and OK'd by them (2 Nov).
const stories = (text: T) => [
  {
    name: "Tengis Gantulga", photo: tengis, tile: "lv-green", scores: [["Math", "780"], ["English", "700"], [text("Нийт", "Total"), "1480"]],
    quote: text(
      "Надад хэрэгтэй бүх зүйл платформ дээр бэлэн байсан тул суугаад хичээлдээ төвлөрөхөд хамаагүй амар байлаа. Интернэт дэх SAT-ын олон материал хуучирсан эсвэл найдваргүй байдаг бол энэ платформын материал шинэчлэгдсэн, College Board-ын жинхэнэ SAT-тай маш ойрхон байсан.",
      "Everything I needed was already available on the platform, which made it so much easier to sit down and focus on studying. A lot of SAT materials online are outdated or unreliable, but the resources on this platform were up-to-date and closely aligned with the actual College Board SAT.",
    ),
  },
  {
    name: "Ganbayar Batbayar", photo: ganbayar, tile: "lv-blue", scores: [["SAT Math", "800/800"]],
    quote: text(
      "Цэцэгс платформ дээрх 2,000 дасгал бодлогыг ердөө нэг сарын дотор бүгдийг нь бодож дуусгасан. Платформ маш цэгцтэй, хэрэглэхэд хялбар байсан. Жинхэнэ SAT өгөхөд бодож чадахгүй математикийн ганц ч бодлого гараагүй.",
      "I completed all 2,000 practice questions on the Tsetsegs platform in just one month. The platform was well-organized and easy to use. When I took the actual SAT, there wasn't a single math question I didn't know how to solve.",
    ),
  },
  {
    name: "Gegee Tserennemekh", photo: gegee, tile: "lv-orange", scores: [["SAT Math", "800/800"]],
    quote: text(
      "Алхам алхмаар тайлбарууд миний хаана алдсаныг яг харуулдаг байсан болохоор нэг алдаагаа давтахаа больсон. Жинхэнэ SAT-тай адилхан бодлогууд дээр дасгал хийснээр шалгалтын өдөр бүх зүйл танил санагдаж, Math-д төгс 800 авсан.",
      "The step-by-step explanations showed me exactly where I went wrong, so I stopped making the same mistakes. Practicing on questions just like the real SAT made test day feel familiar, and I got a perfect 800 in Math.",
    ),
  },
  {
    name: "Nyamsambuu Munkhbat", photo: nyamsambuu, tile: "lv-pink", scores: [["SAT Math", "800/800"]],
    quote: text(
      "Өдөр бүр чансаа, streak-ээ харах нь хичээл хийх хүсэлгүй өдрүүдэд ч дасгалаа үргэлжлүүлэхэд тусалсан. Практик тестүүд жинхэнэ SAT шиг байсан тул шалгалтын өдөр гэнэтийн зүйл гараагүй, Math-д төгс 800 авсан.",
      "Checking my rank and streak every day kept me practicing even on days I didn't feel like it. The practice tests felt like the real SAT, so nothing surprised me on test day, and I got a perfect 800 in Math.",
    ),
  },
  {
    name: "Tsengeg Ulziibayar", photo: tsengeg, tile: "lv-violet", scores: [["SAT Math", "790"]],
    quote: text(
      "Flowersos платформоор бэлтгэл хийснээр SAT Math хэсэгт маш богино буюу ердөө 1 сарын хугацаанд 790 оноо авах боломжтой болсон. Платформ дээр байрлах 2000 гаруй бодлого нь мэдлэгээ бататгах, бодлого бодох арга барилаа хөгжүүлэх, өөрийн сул талаа олж сайжруулахад маш их тусалсан. Мөн Bronze-оос Ruby гэсэн өөрийн дотоод ranking system-тэй болохоор сонирхолтой, өрсөлдөөнтэйгөөр суралцахад тусалдаг. Миний хувьд Flowersos бол богино хугацаанд үр дүнтэй бэлдэж, зорилгодоо хүрэхэд тусалсан үнэ цэнтэй платформ юм.",
      "Preparing on the Flowersos platform, I scored 790 on SAT Math in a very short time, just one month. The 2,000+ questions on the platform helped me a lot to strengthen what I know, build my problem-solving approach, and find and fix my weak spots. Its own ranking system, from Bronze to Ruby, also makes studying fun and competitive. For me, Flowersos is a valuable platform that helped me prepare well in a short time and reach my goal.",
    ),
  },
];

/** OnePrep-style "Student stories" slider: cut-out photo on a colour tile, the student's words, the score. */
export function StudentStories({ text }: { text: T }) {
  return (
    <Carousel opts={{ align: "start" }} className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <h3 className="font-chillax text-3xl font-medium">{text("Сурагчдын түүх", "Student stories")}</h3>
        <div className="flex gap-2">
          <CarouselPrevious className="static h-11 w-11 translate-y-0 border-2" />
          <CarouselNext className="static h-11 w-11 translate-y-0 border-2" />
        </div>
      </div>
      <CarouselContent className="mt-6 items-start sm:items-stretch">{stories(text).map(s => (
        <CarouselItem key={s.name} className="basis-[85%] sm:basis-[48%] lg:basis-[31%]">
          <figure className="lv-card flex h-full flex-col p-2">
            <div className={`aspect-[6/5] overflow-hidden rounded-2xl ${s.tile}`}><img src={s.photo} alt={s.name} loading="lazy" className="h-full w-full object-cover object-top" /></div>
            <figcaption className="px-3 pt-4 text-lg font-medium">{s.name}</figcaption>
            <blockquote className="px-3 pb-5 pt-2 text-sm leading-relaxed">“{s.quote}”</blockquote>
            <div className="mt-auto rounded-2xl bg-muted p-4">
              <p className="flex items-center gap-2 text-sm font-medium"><BrandMark className="h-5 w-5" />flowersos</p>
              <dl className="mt-3 flex items-end justify-between gap-3">{s.scores.map(([l, v], i) => (
                <div key={l}><dt className="text-xs text-muted-foreground">{l}</dt><dd className={`font-mono text-2xl font-semibold ${i === s.scores.length - 1 ? "text-[hsl(var(--lv-green-ink))]" : ""}`}>{v}</dd></div>
              ))}</dl>
            </div>
          </figure>
        </CarouselItem>
      ))}</CarouselContent>
    </Carousel>
  );
}
