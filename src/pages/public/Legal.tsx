import { LegalPage } from "@/components/landing/LegalPage";

// Owner name "Tsetsegs SAT Prep" is a placeholder until the company is set up (Saagii, 12 Nov 2026). Have a lawyer review both pages.
const UPDATED = "12 November 2026";
const EMAIL = <a href="mailto:manager@tsetsegs.com">manager@tsetsegs.com</a>;

export function Terms() {
  return (
    <LegalPage title="Terms of Use" updated={UPDATED}>
      <p>These terms cover your use of flowersos, the SAT practice platform at flowersos.co, including the student, teacher and center portals. flowersos is run by <strong>Tsetsegs SAT Prep</strong> (“we”, “us”), 1114, Ikh Nayad East Tower, 15-r khoroo, Khan-Uul district, Ulaanbaatar, Mongolia. By creating an account or using flowersos, you agree to these terms and to our <a href="/privacy">Privacy Policy</a>.</p>

      <h2>Who can use flowersos</h2>
      <ul>
        <li>You must be at least 13 years old.</li>
        <li>If you are under 18, a parent or guardian must agree to these terms for you.</li>
        <li>If a school or tutoring center gave you your account, your center’s agreement with us also applies. Your center can see your practice results and may close your account when you leave.</li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate details when you sign up, and keep your sign-in private. One account is for one person.</li>
        <li>You are responsible for what happens on your account. Tell us at {EMAIL} if you think someone else is using it.</li>
        <li>To keep accounts personal, we may limit how many devices an account can be used on.</li>
      </ul>

      <h2>Plans and payment</h2>
      <ul>
        <li>The Free plan needs no card and never expires, but it has limits, such as how many questions, speed sessions and practice tests you can use. Our <a href="/?lang=eng#pricing">pricing section</a> shows exactly what it includes.</li>
        <li>Paid plans renew automatically each month or year until you cancel. Prices are shown before you pay.</li>
        <li>A free trial of a paid plan needs a card. We remind you before the trial ends. If you don’t cancel before it ends, the plan starts and you are charged.</li>
        <li>You can cancel at any time. You keep paid features until the end of the period you paid for, then your account moves to the Free plan. Your progress stays.</li>
        <li>If a payment fails, your account moves to the Free plan.</li>
      </ul>

      <h2 id="refunds">Refunds</h2>
      <ul>
        <li>You can get a full refund within 14 days of a payment, on both the monthly and the yearly plan. This includes the first payment after a free trial.</li>
        <li>To ask for one, email {EMAIL} from your account’s email address. You don’t need to give a reason. We give one refund per account.</li>
        <li>As soon as we refund a payment, your account moves to the Free plan. Your progress stays.</li>
        <li>After 14 days we don’t refund, but you can cancel at any time and keep paid features until the end of the period you paid for.</li>
        <li>If you were charged by mistake, email us whenever you notice and we will put it right.</li>
        <li>Nothing here takes away refund rights you have under the law where you live.</li>
      </ul>

      <h2>Our content</h2>
      <p>The questions, explanations, videos, figures and software on flowersos belong to us or to the people who license them to us. You may use them for your own SAT preparation. You may not copy, download in bulk, share, sell or publish them, or use them to build another product, without our written permission.</p>

      <h2>Fair use</h2>
      <p>Don’t:</p>
      <ul>
        <li>share your account or let someone else practice on it;</li>
        <li>cheat in practice tests, live games, sprints or leagues, or get help that the activity doesn’t allow;</li>
        <li>use bots, scrapers or other automated tools on flowersos;</li>
        <li>try to get around limits, locks or plan restrictions, or into parts of flowersos you aren’t meant to reach;</li>
        <li>harass other users or use a name that is offensive or pretends to be someone else.</li>
      </ul>
      <p>We may remove points, reset rankings, or suspend or close accounts that break these rules.</p>

      <h2>No score guarantee</h2>
      <p>flowersos helps you practice. Your SAT score depends on many things we don’t control, so we don’t promise any particular score or result. Practice scores and predicted scores are estimates, not official SAT scores.</p>

      <h2>Not affiliated with the College Board</h2>
      <p>SAT and Bluebook are trademarks or registered trademarks of the College Board, and Desmos is a trademark of Desmos Studio PBC. Neither is affiliated with flowersos or endorses it.</p>

      <h2>Changes and availability</h2>
      <p>We keep improving flowersos, so features may change. We try to keep it running, but we can’t promise it will always be available or free of errors. If we change these terms in a way that matters, we will tell you by email or in the app before the change takes effect.</p>

      <h2>Ending your account</h2>
      <p>You can stop using flowersos at any time and ask us to delete your account at {EMAIL}. We may suspend or close an account that breaks these terms, and we will tell you why unless the law stops us.</p>

      <h2>Liability</h2>
      <p>flowersos is provided “as is”. To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability to you is limited to what you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under the law where you live that can’t be limited.</p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of Mongolia. If you live elsewhere, you keep the protections that your local consumer law gives you.</p>

      <h2>Contact</h2>
      <p>Questions about these terms: {EMAIL}.</p>
    </LegalPage>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated={UPDATED}>
      <p>This policy explains what personal data flowersos collects, why, who can see it, and what you can do about it. flowersos is run by <strong>Tsetsegs SAT Prep</strong> (“we”, “us”), 1114, Ikh Nayad East Tower, 15-r khoroo, Khan-Uul district, Ulaanbaatar, Mongolia. Contact us at {EMAIL}.</p>
      <p>If a school or tutoring center gave you your account, that center also decides what is recorded in its classes. You can ask your center or us about your data.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address or phone number, and password (stored only in scrambled, hashed form). If you sign in with Google, Apple or Microsoft, we receive your name and email from them.</li>
        <li><strong>Study details you give us:</strong> school, grade, SAT test date, target score, and earlier or official SAT scores.</li>
        <li><strong>Class sign-up details:</strong> when a center enrolls you, it may record a parent or guardian’s name and phone number.</li>
        <li><strong>Practice activity:</strong> the questions you answer, your answers, how long you take, scores, points, streaks, badges, test results and use of tools like the calculator. Teachers may add attendance and notes.</li>
        <li><strong>Device and security data:</strong> when you sign in, your IP address and browser details. Students in the main portal also get a random device ID and a code made from browser settings (such as screen size, time zone and language), so an account can only be used on a limited number of devices.</li>
        <li><strong>Messages you send us:</strong> what you write in our contact, support and educator forms, bug reports and screenshots, and replies to our text messages.</li>
      </ul>
      <p>When you create a solo account, we check which country you are connecting from, because solo accounts are not available in Mongolia. We don’t store it.</p>
      <p>When paid plans launch, your card is handled by our payment provider. We will not see or store your full card number.</p>

      <h2>How we use it</h2>
      <ul>
        <li>to run flowersos: sign you in, save your progress and show your results, predicted scores and study plan;</li>
        <li>to run leaderboards, leagues, live games and other features you take part in;</li>
        <li>to send sign-in codes, account emails and, for center students, text messages about classes;</li>
        <li>to keep accounts secure and personal, and to stop account sharing and cheating;</li>
        <li>to answer your questions and fix problems;</li>
        <li>to improve our questions and features.</li>
      </ul>
      <p>We don’t sell your data, don’t show ads, and don’t use advertising or analytics trackers.</p>
      <p>Where the law requires a legal reason, we rely on providing the service you signed up for, our legitimate interest in keeping flowersos safe and working, and your consent where we ask for it.</p>

      <h2>Who can see it</h2>
      <ul>
        <li><strong>Your center and teachers</strong> (if you joined through one) see your profile, contact details, results and notes.</li>
        <li><strong>Other students</strong> see your name, class, points, rank and some scores on leaderboards, live games and profiles. Some leaderboards shorten your name to a first name and last initial. If you have no name on the main portal, the last 4 digits of your phone number are shown instead.</li>
        <li><strong>Parents and guardians</strong> can see reports that your center shares with them by link.</li>
      </ul>

      <h2>Services we use</h2>
      <p>These companies process data for us so flowersos can work:</p>
      <ul>
        <li><strong>Supabase</strong>: database, sign-in and file storage.</li>
        <li><strong>Lovable</strong>: hosting, sign-in with Google, Apple and Microsoft, and sending email.</li>
        <li><strong>Google, Apple and Microsoft</strong>: only if you choose to sign in with them.</li>
        <li><strong>OpenAI</strong> (through Lovable): writes study tips from your practice statistics, such as accuracy by topic. We don’t send your name, and the data isn’t kept for training.</li>
        <li><strong>Twilio</strong> (through Lovable): text messages to center students and their parents.</li>
        <li><strong>YouTube, Google Drive and Desmos</strong>: some videos and the graphing calculator load from them, so they see your IP address and browser when you use them.</li>
        <li><strong>Google Fonts and Fontshare</strong>: our fonts load from their servers.</li>
      </ul>
      <p>These services may store data outside your country. We only share what each one needs.</p>

      <h2>Browser storage</h2>
      <p>We use cookies and your browser’s local storage only to keep you signed in, remember settings like language and theme, save unfinished work, and recognise your device for the device limit. We don’t use them for ads or tracking, so we don’t ask for cookie consent.</p>

      <h2>How long we keep it</h2>
      <p>We keep your data while your account is open, so your progress stays with you. When an account is deleted, we delete its profile and practice history. We may keep a few records we need for security, legal or accounting reasons, such as a log of text messages we sent or, later, payment records.</p>

      <h2>Your choices and rights</h2>
      <p>You can ask us to show you, correct, export or delete your data, or to stop using it for a purpose. Email {EMAIL} from the address on your account. We reply within 30 days. If you live in the EU, the UK or another place with data protection laws, you can also complain to your local data protection authority.</p>

      <h2>Children</h2>
      <p>flowersos is for students aged 13 and over. If you are under 18, a parent or guardian must agree to our <a href="/terms">Terms of Use</a>. If we learn that a child under 13 is using flowersos without a parent’s consent, we will delete the account. Parents can contact us at {EMAIL}.</p>

      <h2>Security</h2>
      <p>Data travels between your browser and our servers encrypted, and passwords are stored hashed. No system is perfectly secure, so tell us at {EMAIL} if you notice anything wrong.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we will tell you by email or in the app before the change takes effect. The date at the top shows the latest version.</p>
    </LegalPage>
  );
}
