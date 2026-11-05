import { BrandMark } from "@/components/BrandMark";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import ganbayar from "@/assets/students/ganbayar.webp";
import tsengeg from "@/assets/students/tsengeg.webp";
import tengis from "@/assets/students/tengis.webp";
import gegee from "@/assets/students/gegee.webp";
import nyamsambuu from "@/assets/students/nyamsambuu.webp";
import temuulen from "@/assets/students/temuulen.webp";
import yeskyendir from "@/assets/students/yeskyendir.webp";
import zayat from "@/assets/students/zayat.webp";
import amine from "@/assets/students/amine.webp";

type T = (mn: string, en: string) => string;

// Sent by Misheel on 2 Nov 2026 with the students' consent. Quotes are the students' own words;
// the English or Mongolian side is our translation. Gegee's and Nyamsambuu's were drafted by us and OK'd by them (2 Nov).
// Temuulen, Yeskyendir and Zayat came from Saagii (2 Nov). He OK'd fixing Temuulen's grammar and trimming Zayat's, tying it to the platform.
// Amine came from Saagii (5 Nov); her English is verbatim.
// Two rows: full-test scores and Math-only scores. A new story goes in the list it fits, highest score first.
const stories = (text: T) => ({
  full: [
    {
      name: "Temuulen Ganzorig", photo: temuulen, tile: "lv-violet", scores: [["Math", "790"], ["English", "750"], [text("Нийт", "Total"), "1540"]],
      quote: text(
        "SAT-ын бэлтгэл хөтөлбөр миний сул талыг олоход маш их тусалсан. English хэсэгт байнга 500 орчим авдаг байсан ч хөтөлбөрийн тусламжтайгаар эцэст нь 700-д хүрсэн. Багш маань надтай ганцаарчлан ажиллаж, үргэлж дэмжиж байсан. Эцэст нь English-д 750, Math-д 790 авч, нийт 1540 оноо авсан. Энэ хөтөлбөргүйгээр би үүнийг хийж чадахгүй байсан.",
        "The SAT prep program really helped me find my weak spots. I was stuck at around 500 in English, and the program finally helped me break through to 700. My teacher worked with me one on one and was really supportive. In the end I got 750 in English and 790 in Math, a 1540 in total. I couldn't have done it without this program.",
      ),
    },
    {
      name: "Amine", photo: amine, tile: "lv-orange", scores: [["Math", "800"], ["English", "720"], [text("Нийт", "Total"), "1520"]],
      quote: text(
        "Энэ вэбсайт миний мөрөөдлийн оноонд хүрэх платформоос хавьгүй илүү зүйл байсан. Энд би гэр бүлтэй болж, яг надад тохирсон дэмжлэг авсан. Багш нар маань бидний үнэлгээний шалгалтын дүнг ашиглан хичээлээ төлөвлөдөг байсан болохоор нэг сэдвийг дахин дахин давтахын оронд бидэнд үнэхээр хэрэгтэй зүйл дээр төвлөрдөг байлаа. Шалгалтын бэлтгэлийн хамгийн чухал хэсэг бол практик тест гэж би боддог. College Board-ын албан ёсны 8 тестийг бодож дуусгасны дараа дахин бодох нь тус болдоггүй, учир нь хариултыг нь санаж эхэлдэг тул оноо чинь бодит бус гардаг. Харин энд бидэнд үргэлж шинэ практик тест байсан, багш нар маань ч маш их мэдлэг, материалтай, халамжтай, үргэлж урам өгдөг байсан. Энэ бол зүгээр нэг вэбсайт биш, ирээдүйн сурагчид манай гэр бүлд нэгдэж, гайхалтай үр дүнд хүрэх боломжтой хамт олон юм. Үүний нэг хэсэг байсандаа би маш их баярлаж байна!",
        "This website was far more than a platform for reaching my dream score. It gave me a family and truly personalized support. Our teachers used our assessment results to tailor their lessons, so we focused on what we actually needed instead of repeating the same topics again and again. I believe the most important part of exam preparation is practice tests, and after finishing the 8 official College Board tests, retaking them doesn’t help because you end up remembering the answers, which makes your results biased. Here, we always had fresh practice tests, and the teachers were incredibly resourceful, caring, and encouraging throughout. More than just a website, this is a community where future students can join our family and achieve great results. I’m so grateful to have been part of it!",
      ),
    },
    {
      name: "Yeskyendir Ye.", photo: yeskyendir, tile: "lv-pink", scores: [[text("SAT нийт", "SAT total"), "1510"]],
      quote: text(
        "Цэцэгсийн хамт олон SAT шалгалтын амжилтанд хамгийн ихээр нөлөөлсөн. SAT Math хэсгийн асуултууд хүнд биш ч заримдаа бодлого бодох цаг нь хомс санагдсан. Үүнд багш нар минь зөв цагийн хуваарилалт, зарим бодлогыг маш амраар бодон цаг хэмнэх аргуудыг сайн зааж өгсөн. SAT English хэсэг Math хэсгээсээ ч илүү хугацаа хомс байдаг тул тухайн чадварууд нь улам бүр үнэ цэнэтэй байсан.",
        "The Tsetsegs team had the biggest impact on my SAT result. The SAT Math questions weren't hard, but sometimes it felt like there wasn't enough time to solve them. My teachers taught me how to pace myself and quick ways to solve some problems that save time. The SAT English section is even shorter on time than Math, so those skills became even more valuable.",
      ),
    },
    {
      name: "Tengis Gantulga", photo: tengis, tile: "lv-green", scores: [["Math", "780"], ["English", "700"], [text("Нийт", "Total"), "1480"]],
      quote: text(
        "Надад хэрэгтэй бүх зүйл платформ дээр бэлэн байсан тул суугаад хичээлдээ төвлөрөхөд хамаагүй амар байлаа. Интернэт дэх SAT-ын олон материал хуучирсан эсвэл найдваргүй байдаг бол энэ платформын материал шинэчлэгдсэн, College Board-ын жинхэнэ SAT-тай маш ойрхон байсан.",
        "Everything I needed was already available on the platform, which made it so much easier to sit down and focus on studying. A lot of SAT materials online are outdated or unreliable, but the resources on this platform were up-to-date and closely aligned with the actual College Board SAT.",
      ),
    },
  ],
  math: [
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
      name: "Zayat Altankhuyag", photo: zayat, tile: "lv-green", scores: [["SAT Math", "800/800"]],
      quote: text(
        "Flowersos платформ өөрөө ойлгож сурах бүх боломжийг олгодог, бас Цэцэгсийн төвд хэзээ ч очоод багшаасаа асууж болно. Анхны оноо маань 580 байхад үнэхээр гонсойсон. Дараа нь 690 авсан ч 700 давна гэж итгэлтэй байсан болохоор хэцүү ч гэсэн цуцлаад дахин өгөх шийдвэр гаргасан. Бүгдийг гараар бодоод их цаг алдсанаа ойлгоод Desmos ашиглаж сурсан. Сүүлийн шалгалтдаа 800 аваад өөрөө ч итгэж чадаагүй. Одоо тэтгэлэгтэй суралцаж байна. Багш нараасаа ч, бусад сурагчдаас ч залхтал асуугаарай!",
        "Flowersos lets you understand things and learn on your own, and you can drop by the Tsetsegs center anytime to ask a teacher. My first score was 580, and I was crushed. Next I got 690, but I'd been sure of 700+, so I made the hard choice to cancel it and try again. I'd lost a lot of time solving everything by hand, so I learned to use Desmos. On my last test I got 800 and couldn't believe it. Now I'm on a scholarship. Ask your teachers and classmates until they're sick of you!",
      ),
    },
    {
      name: "Tsengeg Ulziibayar", photo: tsengeg, tile: "lv-violet", scores: [["SAT Math", "790"]],
      quote: text(
        "Flowersos платформоор бэлтгэл хийснээр SAT Math хэсэгт маш богино буюу ердөө 1 сарын хугацаанд 790 оноо авах боломжтой болсон. Платформ дээр байрлах 2000 гаруй бодлого нь мэдлэгээ бататгах, бодлого бодох арга барилаа хөгжүүлэх, өөрийн сул талаа олж сайжруулахад маш их тусалсан. Мөн Bronze-оос Ruby гэсэн өөрийн дотоод ranking system-тэй болохоор сонирхолтой, өрсөлдөөнтэйгөөр суралцахад тусалдаг. Миний хувьд Flowersos бол богино хугацаанд үр дүнтэй бэлдэж, зорилгодоо хүрэхэд тусалсан үнэ цэнтэй платформ юм.",
        "Preparing on the Flowersos platform, I scored 790 on SAT Math in a very short time, just one month. The 2,000+ questions on the platform helped me a lot to strengthen what I know, build my problem-solving approach, and find and fix my weak spots. Its own ranking system, from Bronze to Ruby, also makes studying fun and competitive. For me, Flowersos is a valuable platform that helped me prepare well in a short time and reach my goal.",
      ),
    },
  ],
});

type Story = ReturnType<typeof stories>["full"][number];

/** OnePrep-style "Student stories": two sliders of cut-out photo on a colour tile, the student's words, the score. */
export function StudentStories({ text }: { text: T }) {
  const { full, math } = stories(text);
  return (
    <div className="mt-14">
      <h3 className="font-chillax text-3xl font-medium">{text("Сурагчдын түүх", "Student stories")}</h3>
      <div className="mt-8 flex flex-col gap-12">
        <StoryRow title={text("Нийт SAT оноо", "Total SAT score")} items={full} />
        <StoryRow title={text("SAT Math оноо", "SAT Math score")} items={math} />
      </div>
    </div>
  );
}

function StoryRow({ title, items }: { title: string; items: Story[] }) {
  return (
    <Carousel opts={{ align: "start" }}>
      <div className="flex items-end justify-between gap-4">
        <h4 className="text-xl font-medium">{title}</h4>
        <div className="flex gap-2">
          <CarouselPrevious className="static h-11 w-11 translate-y-0 border-2" />
          <CarouselNext className="static h-11 w-11 translate-y-0 border-2" />
        </div>
      </div>
      <CarouselContent className="mt-5 items-start sm:items-stretch">{items.map(s => (
        <CarouselItem key={s.name} className="basis-[85%] sm:basis-[48%] lg:basis-[31%]">
          <figure className="lv-card flex h-full flex-col p-2">
            <div className={`aspect-[6/5] overflow-hidden rounded-2xl ${s.tile}`}><img src={s.photo} alt={s.name} loading="lazy" className="h-full w-full object-cover object-top" /></div>
            <figcaption className="px-3 pt-4 text-lg font-medium">{s.name}</figcaption>
            {/* Same height on every card. Long quotes scroll; the fade hints there's more. */}
            <blockquote className="h-[22rem] overflow-y-auto px-3 pb-8 pt-2 text-sm leading-relaxed [mask-image:linear-gradient(to_bottom,black_calc(100%-2rem),transparent)]">“{s.quote}”</blockquote>
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
