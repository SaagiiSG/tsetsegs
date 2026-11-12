// Footer notice for both landing pages: they name SAT, Bluebook and Desmos, none of which is ours.
export function TrademarkNotice({ text }: { text: (mon: string, eng: string) => string }) {
  return (
    <div className="lv-container"><div className="mt-8 border-t border-border pt-6">
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">{text(
        "SAT болон Bluebook нь College Board-ын барааны тэмдэг буюу бүртгэлтэй барааны тэмдэг, Desmos нь Desmos Studio PBC-ийн барааны тэмдэг юм. Эдгээрийг энэ вэбсайтад зөвхөн таниулах зорилгоор ашигласан бөгөөд College Board эсвэл Desmos Studio-тэй ямар нэг холбоо, хамаарал байгааг, мөн тэд энэ вэбсайтын агуулга эсвэл flowersos-ийн үйлчилгээг дэмжсэнийг илэрхийлэхгүй.",
        "SAT and Bluebook are trademarks or registered trademarks of the College Board, and Desmos is a trademark of Desmos Studio PBC. They are used on this website for identification purposes only. Their use does not imply any relationship or affiliation with the College Board or Desmos Studio, nor endorsement by them of the contents of this website or of the services provided by flowersos.",
      )}</p>
    </div></div>
  );
}
