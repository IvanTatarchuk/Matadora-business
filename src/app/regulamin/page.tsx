import Link from "next/link";
import { HardHat } from "lucide-react";

export const metadata = {
  title: "Regulamin — matadora.business",
  description:
    "Regulamin świadczenia usług drogą elektroniczną platformy matadora.business (VANBUD Ivan Tatarchuk).",
};

export default function RegulaminPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 whitespace-nowrap font-extrabold text-xl tracking-tight">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <span>
              MATADORA<span className="text-primary">.business</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="/kosztorys" className="text-muted-foreground hover:text-foreground">Kosztorys</Link>
            <Link href="/przetargi" className="text-muted-foreground hover:text-foreground">Przetargi</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Cennik</Link>
            <Link href="/o-nas" className="text-muted-foreground hover:text-foreground">O nas</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-white">
        <div className="container max-w-3xl py-12">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Regulamin świadczenia usług drogą elektroniczną</h1>
          <p className="mt-2 text-sm text-muted-foreground">Data ostatniej aktualizacji: 2 lipca 2026 r.</p>

          <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-lg font-bold text-slate-900">§ 1. Postanowienia ogólne</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>
                  Niniejszy regulamin (dalej: „Regulamin&rdquo;) określa zasady korzystania z platformy internetowej
                  dostępnej pod adresem <strong>matadora.business</strong> (dalej: „Platforma&rdquo; lub „Serwis&rdquo;),
                  w tym zasady świadczenia usług drogą elektroniczną w rozumieniu ustawy z dnia 18 lipca 2002 r.
                  o świadczeniu usług drogą elektroniczną (Dz. U. z 2020 r. poz. 344 z późn. zm.).
                </li>
                <li>
                  Operatorem Platformy i podmiotem świadczącym usługi opisane w Regulaminie jest{" "}
                  <strong>VANBUD Ivan Tatarchuk</strong>, prowadzący działalność gospodarczą pod adresem
                  ul. Mielecka 5, 70-740 Szczecin, NIP: <strong>955-235-98-44</strong> (dalej: „Operator&rdquo; lub
                  „Usługodawca&rdquo;).
                </li>
                <li>
                  Kontakt z Operatorem możliwy jest pod adresem e-mail:{" "}
                  <a href="mailto:vanbud.felix@gmail.com" className="text-primary underline">vanbud.felix@gmail.com</a>.
                </li>
                <li>
                  Korzystanie z Platformy — w tym utworzenie konta, wygenerowanie kosztorysu lub dokonanie
                  zakupu — oznacza akceptację niniejszego Regulaminu w całości. Osoba, która nie akceptuje
                  Regulaminu, powinna zaprzestać korzystania z Platformy.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">§ 2. Definicje</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li><strong>Użytkownik</strong> — osoba fizyczna, osoba prawna lub jednostka organizacyjna korzystająca z Platformy.</li>
                <li><strong>Konto</strong> — indywidualny profil Użytkownika w Serwisie, utworzony po rejestracji, umożliwiający korzystanie z funkcji zależnych od roli (inwestor, wykonawca, hurtownia).</li>
                <li><strong>Usługa</strong> — funkcjonalności udostępniane w ramach Platformy, w szczególności: kreator kosztorysów budowlanych, marketplace ofert, moduł zarządzania projektami, alerty przetargowe, moduły finansowe i dokumentacyjne.</li>
                <li><strong>Zakup jednorazowy</strong> — odpłatne odblokowanie pojedynczego kosztorysu lub pakietu funkcji, rozliczane per transakcja, bez konieczności zawierania umowy abonamentowej.</li>
                <li><strong>Konsument</strong> — Użytkownik będący osobą fizyczną dokonującą czynności prawnej niezwiązanej bezpośrednio z jej działalnością gospodarczą lub zawodową w rozumieniu art. 22¹ Kodeksu cywilnego.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">§ 3. Zakres usług</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>
                  Platforma umożliwia w szczególności: tworzenie kosztorysów budowlanych zgodnych z normami KNR,
                  generowanie i wysyłkę ofert do inwestorów, elektroniczną akceptację ofert, publikowanie i
                  przeglądanie zleceń (marketplace), zarządzanie projektami budowlanymi (harmonogramy, budżety,
                  dokumentacja BHP, zamówienia materiałowe), monitorowanie przetargów publicznych oraz — w
                  wybranych modułach — analizę dokumentów (np. rzutów architektonicznych w formacie PDF) z
                  wykorzystaniem sztucznej inteligencji (Claude API dostarczane przez Anthropic).
                </li>
                <li>
                  Część funkcji Serwisu dostępna jest bezpłatnie (np. pierwszy kosztorys, przegląd cennika),
                  a część odpłatnie — zgodnie z aktualnym cennikiem publikowanym pod adresem{" "}
                  <Link href="/pricing" className="text-primary underline">matadora.business/pricing</Link>.
                </li>
                <li>
                  Operator zastrzega sobie prawo do modyfikowania, rozszerzania lub ograniczania zakresu Usług,
                  w tym wprowadzania nowych funkcji lub wycofywania istniejących, z zachowaniem praw nabytych
                  Użytkowników w ramach już opłaconych Usług.
                </li>
                <li>
                  Wyniki kosztorysów, w tym stawki robocizny i materiałów sugerowane przez Platformę (w tym
                  przez moduł analizy AI), mają charakter <strong>orientacyjny/szacunkowy</strong> i nie stanowią
                  oficjalnych danych SEKOCENBUD ani wiążącej wyceny. Użytkownik jest zobowiązany zweryfikować
                  poprawność kosztorysu przed jego wykorzystaniem w obrocie prawnym lub handlowym.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">§ 4. Rejestracja i konto Użytkownika</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>Korzystanie z niektórych funkcji Platformy wymaga założenia Konta poprzez podanie adresu e-mail, hasła oraz danych identyfikujących rolę Użytkownika (inwestor / wykonawca / hurtownia).</li>
                <li>Użytkownik zobowiązany jest do podawania danych prawdziwych, aktualnych i kompletnych oraz do niezwłocznej ich aktualizacji w razie zmiany.</li>
                <li>Użytkownik ponosi odpowiedzialność za zachowanie poufności danych logowania do Konta oraz za wszelkie działania podejmowane przy jego użyciu.</li>
                <li>Operator może zawiesić lub usunąć Konto Użytkownika w przypadku naruszenia Regulaminu, przepisów prawa lub w przypadku działania na szkodę Platformy lub innych Użytkowników.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">§ 5. Płatności</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>
                  Płatności za odpłatne Usługi realizowane są za pośrednictwem zewnętrznego operatora płatności{" "}
                  <strong>Stripe, Inc.</strong> (Stripe Payments Europe, Limited), zgodnie z regulaminem i
                  polityką bezpieczeństwa tego dostawcy. Operator Platformy nie przechowuje danych kart
                  płatniczych Użytkowników.
                </li>
                <li>
                  Ceny Usług podawane są w złotych polskich (PLN) i, o ile nie zaznaczono inaczej, są cenami
                  brutto (zawierają podatek VAT wg obowiązującej stawki).
                </li>
                <li>
                  Korzystanie z Platformy jest bezpłatne. Odpłatne są wyłącznie następujące Usługi, rozliczane
                  jednorazowo (<strong>„płać za użycie&rdquo;</strong>, pay-per-use), zgodnie z cennikiem dostępnym
                  na stronie <Link href="/pricing" className="text-primary underline">/pricing</Link>:
                  analiza AI kosztorysu z przesłanego dokumentu PDF, analiza AI zdjęcia budowy pod kątem
                  zgodności z przepisami BHP oraz sesja modułu Adwokat AI (generowanie projektu umowy i
                  analiza dokumentu prawnego). Platforma nie oferuje planów abonamentowych ani cyklicznych
                  opłat subskrypcyjnych.
                </li>
                <li>
                  Po zaksięgowaniu płatności Użytkownik otrzymuje dostęp do zakupionej Usługi. Faktura VAT
                  jest wystawiana i przesyłana automatycznie na adres e-mail Użytkownika niezwłocznie po
                  zaksięgowaniu płatności, a dodatkowo dostępna jest do pobrania na stronie Platformy pod
                  unikalnym adresem przekazanym w wiadomości e-mail. Na żądanie Użytkownika, w szczególności
                  dla celów księgowych, Operator wystawia fakturę korygującą lub duplikat zgodnie z
                  obowiązującymi przepisami, w tym — jeśli dotyczy — w formacie ustrukturyzowanym zgodnym z
                  Krajowym Systemem e-Faktur (KSeF).
                </li>
                <li>
                  W przypadku niepowodzenia płatności lub jej wycofania przez operatora płatności, dostęp do
                  zakupionej Usługi może zostać zawieszony do czasu wyjaśnienia sprawy.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">§ 6. Prawo odstąpienia od umowy i zwroty</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>
                  Zgodnie z art. 27 ustawy z dnia 30 maja 2014 r. o prawach konsumenta, Konsument ma prawo
                  odstąpić od umowy zawartej na odległość w terminie <strong>14 dni</strong> od jej zawarcia, bez
                  podania przyczyny, składając oświadczenie o odstąpieniu na adres e-mail Operatora.
                </li>
                <li>
                  Zgodnie z art. 38 pkt 13 ww. ustawy, prawo odstąpienia <strong>nie przysługuje</strong> w
                  odniesieniu do umów o dostarczanie treści cyfrowych niezapisanych na nośniku materialnym
                  (np. wygenerowanego kosztorysu, wyniku analizy AI), jeżeli spełnianie świadczenia rozpoczęło
                  się za wyraźną zgodą Konsumenta przed upływem terminu do odstąpienia od umowy i po
                  poinformowaniu go przez Operatora o utracie prawa odstąpienia od umowy. Użytkownik
                  wyraża taką zgodę poprzez rozpoczęcie generowania kosztorysu lub pobranie wyniku analizy
                  bezpośrednio po dokonaniu płatności.
                </li>
                <li>
                  W przypadku wystąpienia błędu technicznego uniemożliwiającego skorzystanie z opłaconej
                  Usługi (np. brak wygenerowania kosztorysu z przyczyn leżących po stronie Platformy),
                  Użytkownikowi przysługuje zwrot pełnej kwoty zapłaconej za daną transakcję. Reklamację
                  należy zgłosić na adres{" "}
                  <a href="mailto:vanbud.felix@gmail.com" className="text-primary underline">vanbud.felix@gmail.com</a>{" "}
                  w terminie 14 dni od dokonania płatności. Operator rozpatruje reklamacje w terminie do 14
                  dni roboczych.
                </li>
                <li>
                  Zwroty realizowane są tym samym kanałem płatności, którym dokonano zapłaty, za pośrednictwem
                  Stripe, w terminie do 14 dni roboczych od pozytywnego rozpatrzenia reklamacji.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">§ 7. Odpowiedzialność</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>
                  Operator dokłada należytej staranności, aby Platforma działała poprawnie i nieprzerwanie,
                  jednak nie gwarantuje pełnej dostępności Serwisu i nie ponosi odpowiedzialności za przerwy
                  wynikające z przyczyn technicznych, siły wyższej lub działań podmiotów trzecich
                  (np. dostawców infrastruktury: Supabase, Vercel, Stripe, Anthropic).
                </li>
                <li>
                  Kosztorysy, wyceny, sugestie stawek oraz wyniki analizy dokumentów generowane przez
                  Platformę — w tym przez moduł oparty na sztucznej inteligencji — mają charakter{" "}
                  <strong>pomocniczy i orientacyjny</strong>. Operator nie ponosi odpowiedzialności za decyzje
                  biznesowe, finansowe lub wykonawcze podjęte przez Użytkownika na podstawie tych danych.
                  Użytkownik jest zobowiązany do samodzielnej weryfikacji wyników przed ich wykorzystaniem.
                </li>
                <li>
                  Operator nie jest stroną umów zawieranych pomiędzy Użytkownikami (np. między inwestorem a
                  wykonawcą za pośrednictwem marketplace) i nie ponosi odpowiedzialności za ich wykonanie,
                  jakość robót budowlanych ani rozliczenia między stronami.
                </li>
                <li>
                  Odpowiedzialność Operatora wobec Użytkownika niebędącego Konsumentem, z tytułu niewykonania
                  lub nienależytego wykonania Usługi, ograniczona jest do wysokości kwoty faktycznie zapłaconej
                  przez Użytkownika za daną Usługę w okresie ostatnich 12 miesięcy, chyba że bezwzględnie
                  obowiązujące przepisy prawa stanowią inaczej.
                </li>
                <li>
                  Powyższe ograniczenia nie mają zastosowania do odpowiedzialności wobec Konsumentów w zakresie,
                  w jakim byłoby to sprzeczne z bezwzględnie obowiązującymi przepisami prawa.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">§ 8. Dane osobowe</h2>
              <p className="mt-3">
                Zasady przetwarzania danych osobowych Użytkowników opisane zostały w odrębnym dokumencie —{" "}
                <Link href="/polityka-prywatnosci" className="text-primary underline">Polityce prywatności</Link>,
                która stanowi integralne uzupełnienie niniejszego Regulaminu.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">§ 9. Reklamacje dotyczące funkcjonowania Serwisu</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>Reklamacje dotyczące działania Platformy można zgłaszać na adres e-mail: <a href="mailto:vanbud.felix@gmail.com" className="text-primary underline">vanbud.felix@gmail.com</a>.</li>
                <li>Zgłoszenie reklamacyjne powinno zawierać opis problemu, dane kontaktowe Użytkownika oraz — jeśli dotyczy — identyfikator transakcji.</li>
                <li>Operator rozpatruje reklamacje w terminie do 14 dni roboczych i informuje Użytkownika o wyniku postępowania reklamacyjnego drogą elektroniczną.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">§ 10. Postanowienia końcowe</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>W sprawach nieuregulowanych Regulaminem zastosowanie mają przepisy prawa polskiego, w szczególności Kodeksu cywilnego, ustawy o świadczeniu usług drogą elektroniczną oraz ustawy o prawach konsumenta.</li>
                <li>Sądem właściwym do rozstrzygania sporów wynikających z Regulaminu, w odniesieniu do Użytkowników niebędących Konsumentami, jest sąd właściwy dla siedziby Operatora. Konsumenci mogą dochodzić roszczeń przed sądem powszechnym właściwym zgodnie z ogólnymi przepisami postępowania cywilnego, a także skorzystać z pozasądowych sposobów rozpatrywania reklamacji (np. platforma ODR: ec.europa.eu/consumers/odr).</li>
                <li>Operator zastrzega sobie prawo do zmiany Regulaminu z ważnych przyczyn (np. zmiana zakresu Usług, zmiana przepisów prawa). O zmianach Regulaminu Użytkownicy posiadający Konto zostaną poinformowani drogą elektroniczną z odpowiednim wyprzedzeniem.</li>
                <li>Regulamin wchodzi w życie z dniem publikacji na stronie matadora.business.</li>
              </ol>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} matadora.business ·{" "}
          <Link href="/" className="hover:text-foreground">Strona główna</Link>
          {" · "}
          <Link href="/polityka-prywatnosci" className="hover:text-foreground">Polityka prywatności</Link>
        </div>
      </footer>
    </div>
  );
}
