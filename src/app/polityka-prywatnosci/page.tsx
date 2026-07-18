import Link from "next/link";
import { HardHat } from "lucide-react";

export const metadata = {
  title: "Polityka prywatności — matadora.business",
  description:
    "Polityka prywatności zgodna z RODO platformy matadora.business (VANBUD Ivan Tatarchuk).",
};

export default function PolitykaPrywatnosciPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <span>matadora</span>
            <span className="text-primary">.business</span>
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
          <h1 className="text-3xl font-extrabold sm:text-4xl">Polityka prywatności</h1>
          <p className="mt-2 text-sm text-muted-foreground">Data ostatniej aktualizacji: 2 lipca 2026 r.</p>
          <p className="mt-4 text-sm leading-relaxed text-slate-700">
            Niniejsza Polityka prywatności opisuje zasady przetwarzania danych osobowych Użytkowników
            platformy matadora.business, zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE)
            2016/679 z dnia 27 kwietnia 2016 r. (dalej: „RODO&rdquo;) oraz ustawą z dnia 10 maja 2018 r. o ochronie
            danych osobowych.
          </p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-lg font-bold text-slate-900">1. Administrator danych osobowych</h2>
              <p className="mt-3">
                Administratorem danych osobowych przetwarzanych w związku z korzystaniem z platformy
                matadora.business jest:
              </p>
              <div className="mt-3 rounded-lg border bg-slate-50 p-4">
                <p className="font-semibold">VANBUD Ivan Tatarchuk</p>
                <p>ul. Mielecka 5, 70-740 Szczecin</p>
                <p>NIP: 955-235-98-44</p>
                <p>
                  E-mail:{" "}
                  <a href="mailto:vanbud.felix@gmail.com" className="text-primary underline">
                    vanbud.felix@gmail.com
                  </a>
                </p>
              </div>
              <p className="mt-3">
                We wszystkich sprawach dotyczących przetwarzania danych osobowych można kontaktować się
                z Administratorem drogą elektroniczną pod powyższym adresem e-mail.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">2. Cele i podstawy prawne przetwarzania danych</h2>
              <p className="mt-3">Dane osobowe Użytkowników przetwarzane są w następujących celach:</p>
              <div className="mt-3 overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Cel przetwarzania</th>
                      <th className="px-3 py-2 font-semibold">Podstawa prawna (RODO)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-3 py-2">Założenie i obsługa Konta, świadczenie usług Platformy (kosztorysy, marketplace, zarządzanie projektami)</td>
                      <td className="px-3 py-2">art. 6 ust. 1 lit. b) — wykonanie umowy</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Realizacja płatności i wystawianie faktur</td>
                      <td className="px-3 py-2">art. 6 ust. 1 lit. b) i c) — wykonanie umowy, obowiązek prawny (przepisy podatkowe)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Analiza dokumentów PDF (kosztorysy, rzuty) z wykorzystaniem AI (Claude API)</td>
                      <td className="px-3 py-2">art. 6 ust. 1 lit. b) — wykonanie umowy, na wyraźne żądanie Użytkownika (wgranie pliku)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Wysyłka wiadomości transakcyjnych i powitalnych e-mail</td>
                      <td className="px-3 py-2">art. 6 ust. 1 lit. b) i f) — wykonanie umowy, prawnie uzasadniony interes Administratora</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Obsługa zgłoszeń i reklamacji</td>
                      <td className="px-3 py-2">art. 6 ust. 1 lit. b) i f) — wykonanie umowy, uzasadniony interes</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Ustalenie, dochodzenie lub obrona roszczeń</td>
                      <td className="px-3 py-2">art. 6 ust. 1 lit. f) — prawnie uzasadniony interes Administratora</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Wypełnienie obowiązków wynikających z przepisów podatkowych i rachunkowych</td>
                      <td className="px-3 py-2">art. 6 ust. 1 lit. c) — obowiązek prawny</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">3. Zakres przetwarzanych danych</h2>
              <p className="mt-3">W zależności od zakresu korzystania z Platformy, Administrator może przetwarzać:</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>dane identyfikacyjne i kontaktowe: imię, nazwisko, adres e-mail, numer telefonu, nazwa firmy, NIP;</li>
                <li>dane związane z realizacją usługi: treść kosztorysów, projektów, ofert, wiadomości w ramach Platformy, dokumenty wgrywane w celu analizy (np. pliki PDF);</li>
                <li>dane dotyczące płatności (w zakresie przetwarzanym po stronie Stripe — Administrator nie przechowuje pełnych danych karty płatniczej);</li>
                <li>dane techniczne: adres IP, identyfikatory urządzenia, dane z plików cookies, logi systemowe.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">4. Odbiorcy danych</h2>
              <p className="mt-3">
                Dane osobowe mogą być powierzane podmiotom przetwarzającym dane w imieniu Administratora, w
                szczególności dostawcom infrastruktury technicznej niezbędnej do świadczenia usług:
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li><strong>Supabase Inc.</strong> — hosting bazy danych i uwierzytelnianie Użytkowników;</li>
                <li><strong>Vercel Inc.</strong> — hosting aplikacji i infrastruktura serwerowa;</li>
                <li><strong>Stripe, Inc. / Stripe Payments Europe, Ltd.</strong> — obsługa płatności online;</li>
                <li><strong>Resend</strong> — wysyłka wiadomości e-mail (powitalnych, transakcyjnych);</li>
                <li><strong>Anthropic PBC</strong> — dostawca modelu AI (Claude API) wykorzystywanego do analizy dokumentów przesłanych dobrowolnie przez Użytkownika.</li>
              </ul>
              <p className="mt-3">
                Część z wymienionych dostawców może przetwarzać dane na serwerach zlokalizowanych poza
                Europejskim Obszarem Gospodarczym (EOG), w szczególności w Stanach Zjednoczonych. W takich
                przypadkach transfer danych odbywa się w oparciu o mechanizmy zapewniające odpowiedni
                stopień ochrony danych osobowych, przewidziane w RODO — w szczególności standardowe klauzule
                umowne (SCC) zatwierdzone przez Komisję Europejską.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">5. Okres przechowywania danych</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>Dane związane z Kontem Użytkownika przechowywane są przez okres jego aktywności oraz przez okres do 3 lat po usunięciu Konta, w celu obrony przed ewentualnymi roszczeniami.</li>
                <li>Dane związane z transakcjami i dokumentami księgowymi (faktury) przechowywane są przez okres wymagany przepisami prawa podatkowego — co do zasady 5 lat, licząc od końca roku kalendarzowego, w którym upłynął termin płatności podatku.</li>
                <li>Dokumenty PDF wgrywane w celu analizy AI przetwarzane są jednorazowo, w celu wygenerowania wyniku analizy, i nie są trwale przechowywane przez Administratora dłużej niż jest to konieczne do realizacji tej usługi.</li>
                <li>Dane przetwarzane na podstawie zgody (np. newsletter, alerty przetargowe) przechowywane są do czasu wycofania zgody.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">6. Prawa Użytkownika</h2>
              <p className="mt-3">W związku z przetwarzaniem danych osobowych, Użytkownikowi przysługują następujące prawa:</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li><strong>prawo dostępu do danych</strong> (art. 15 RODO) — uzyskania informacji o przetwarzanych danych i otrzymania ich kopii;</li>
                <li><strong>prawo do sprostowania danych</strong> (art. 16 RODO) — poprawienia nieprawidłowych lub niekompletnych danych;</li>
                <li><strong>prawo do usunięcia danych</strong> („prawo do bycia zapomnianym&rdquo;, art. 17 RODO);</li>
                <li><strong>prawo do ograniczenia przetwarzania</strong> (art. 18 RODO);</li>
                <li><strong>prawo do przenoszenia danych</strong> (art. 20 RODO) — otrzymania danych w ustrukturyzowanym formacie i przekazania ich innemu administratorowi;</li>
                <li><strong>prawo do sprzeciwu</strong> wobec przetwarzania danych opartego na uzasadnionym interesie Administratora (art. 21 RODO);</li>
                <li><strong>prawo do cofnięcia zgody</strong> w dowolnym momencie, bez wpływu na zgodność z prawem przetwarzania dokonanego przed jej cofnięciem — w zakresie, w jakim dane przetwarzane są na podstawie zgody;</li>
                <li><strong>prawo do wniesienia skargi</strong> do organu nadzorczego — Prezesa Urzędu Ochrony Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa.</li>
              </ul>
              <p className="mt-3">
                W celu skorzystania z powyższych praw należy skontaktować się z Administratorem pod adresem{" "}
                <a href="mailto:vanbud.felix@gmail.com" className="text-primary underline">vanbud.felix@gmail.com</a>.
                Administrator udziela odpowiedzi bez zbędnej zwłoki, nie później niż w terminie miesiąca od
                otrzymania żądania.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">7. Pliki cookies</h2>
              <p className="mt-3">
                Platforma wykorzystuje pliki cookies (ciasteczka) niezbędne do prawidłowego funkcjonowania
                Serwisu, w szczególności do utrzymania sesji zalogowanego Użytkownika (obsługa uwierzytelniania
                za pośrednictwem Supabase). Platforma może również wykorzystywać cookies analityczne, służące
                do poprawy jakości i funkcjonalności Serwisu. Użytkownik może zarządzać ustawieniami cookies
                za pośrednictwem ustawień swojej przeglądarki internetowej, w tym zablokować lub ograniczyć
                ich zapisywanie — może to jednak wpłynąć na prawidłowe działanie niektórych funkcji Platformy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">8. Bezpieczeństwo danych</h2>
              <p className="mt-3">
                Administrator stosuje odpowiednie środki techniczne i organizacyjne w celu zapewnienia
                bezpieczeństwa przetwarzanych danych osobowych, w tym: szyfrowanie połączenia (SSL/TLS),
                mechanizmy kontroli dostępu oparte na rolach (Row Level Security), oraz korzysta z dostawców
                infrastruktury spełniających uznane standardy bezpieczeństwa. Dostęp do danych mają wyłącznie
                osoby upoważnione, w zakresie niezbędnym do wykonywania swoich obowiązków.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">9. Zautomatyzowane podejmowanie decyzji</h2>
              <p className="mt-3">
                Platforma wykorzystuje modele sztucznej inteligencji (Claude API firmy Anthropic) do
                wspomagania Użytkownika w analizie dokumentów oraz generowaniu sugestii kosztorysowych.
                Wyniki te mają charakter wyłącznie pomocniczy i informacyjny — nie stanowią zautomatyzowanego
                podejmowania decyzji wywołującego skutki prawne wobec Użytkownika w rozumieniu art. 22 RODO,
                a ostateczne decyzje (np. akceptacja kosztorysu, wybór stawek) podejmowane są każdorazowo
                przez Użytkownika.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">10. Zmiany Polityki prywatności</h2>
              <p className="mt-3">
                Administrator zastrzega sobie prawo do wprowadzania zmian w niniejszej Polityce prywatności,
                w szczególności w związku ze zmianą przepisów prawa, zakresu świadczonych usług lub
                stosowanych narzędzi. Aktualna wersja Polityki prywatności zawsze dostępna jest pod adresem
                matadora.business/polityka-prywatnosci.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} matadora.business ·{" "}
          <Link href="/" className="hover:text-foreground">Strona główna</Link>
          {" · "}
          <Link href="/regulamin" className="hover:text-foreground">Regulamin</Link>
        </div>
      </footer>
    </div>
  );
}
