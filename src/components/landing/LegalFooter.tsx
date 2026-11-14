// Bottom of both landing footers: legal links, and the trademark notice (the pages name SAT, Bluebook and Desmos, none of which is ours).
export function LegalFooter({ text }: { text: (mon: string, eng: string) => string }) {
  return (
    <div className="lv-container"><div className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
      <p className="flex flex-wrap gap-x-6 gap-y-2"><span>© {new Date().getFullYear()} Tsetsegs SAT Prep</span><a href="/privacy" className="hover:text-foreground">{text("Нууцлалын бодлого", "Privacy Policy")}</a><a href="/terms" className="hover:text-foreground">{text("Үйлчилгээний нөхцөл", "Terms of Use")}</a></p>
      <p className="mt-4 max-w-3xl leading-relaxed">{text(
        "SAT болон Bluebook нь College Board-ын барааны тэмдэг буюу бүртгэлтэй барааны тэмдэг, Desmos нь Desmos Studio PBC-ийн барааны тэмдэг юм. Эдгээрийг энэ вэбсайтад зөвхөн таниулах зорилгоор ашигласан бөгөөд College Board эсвэл Desmos Studio-тэй ямар нэг холбоо, хамаарал байгааг, мөн тэд энэ вэбсайтын агуулга эсвэл flowersos-ийн үйлчилгээг дэмжсэнийг илэрхийлэхгүй.",
        "SAT and Bluebook are trademarks or registered trademarks of the College Board, and Desmos is a trademark of Desmos Studio PBC. They are used on this website for identification purposes only. Their use does not imply any relationship or affiliation with the College Board or Desmos Studio, nor endorsement by them of the contents of this website or of the services provided by flowersos.",
      )}</p>
    </div></div>
  );
}
