import { StageInput } from "./offer-calc";

export type OfferTemplateType = 
  | "investor" 
  | "contractor" 
  | "developer"
  | "renovation"
  | "new_construction"
  | "commercial"
  | "industrial"
  | "infrastructure"
  | "knr_standard"
  | "knr_simplified"
  | "material_labor"
  | "public_sector"
  | "private_client";

export interface TemplatePreset {
  name: string;
  description: string;
  category: "client" | "project_type" | "method" | "sector";
  defaultVatRate: number;
  stages: StageInput[];
}

export const TEMPLATE_PRESETS: Record<OfferTemplateType, TemplatePreset> = {
  investor: {
    name: "Oferta dla inwestora prywatnego",
    description: "Szczegółowa oferta z podziałem na etapy i koszty",
    category: "client",
    defaultVatRate: 8,
    stages: [
      { stage_name: "Logistyka", description: "Transport, przygotowanie placu budowy, wynajem sprzętu", cost: 0, order_index: 0 },
      { stage_name: "Demontaż", description: "Rozbiórka, wywóz gruzu, prace przygotowawcze", cost: 0, order_index: 1 },
      { stage_name: "Roboty wykończeniowe", description: "Prace wykończeniowe zgodne z projektem", cost: 0, order_index: 2 },
      { stage_name: "Instalacje", description: "Elektryka, hydraulika, wentylacja", cost: 0, order_index: 3 },
      { stage_name: "Materiały", description: "Materiały budowlane z hurtowni", cost: 0, order_index: 4 },
    ],
  },
  contractor: {
    name: "Oferta dla generalnego wykonawcy",
    description: "Oferta podwykonawcza z harmonogramem i specyfikacją",
    category: "client",
    defaultVatRate: 23,
    stages: [
      { stage_name: "Przygotowanie", description: "Przygotowanie placu budowy, zabezpieczenia", cost: 0, order_index: 0 },
      { stage_name: "Roboty główne", description: "Główne prace zgodne z umową", cost: 0, order_index: 1 },
      { stage_name: "Instalacje", description: "Wszystkie instalacje techniczne", cost: 0, order_index: 2 },
      { stage_name: "Wykończenie", description: "Prace wykończeniowe", cost: 0, order_index: 3 },
      { stage_name: "Odbiór", description: "Prace związane z odbiorem", cost: 0, order_index: 4 },
    ],
  },
  developer: {
    name: "Oferta dla dewelopera",
    description: "Kompleksowa oferta wieloetapowa z gwarancjami",
    category: "client",
    defaultVatRate: 8,
    stages: [
      { stage_name: "Fundamenty", description: "Roboty ziemne, fundamenty, izolacja", cost: 0, order_index: 0, group_label: "Stan zerowy" },
      { stage_name: "Konstrukcja", description: "Ściany, stropy, dach", cost: 0, order_index: 1, group_label: "Stan surowy" },
      { stage_name: "Instalacje w stanie surowym", description: "Instalacje w ścianach i podłogach", cost: 0, order_index: 2, group_label: "Stan surowy" },
      { stage_name: "Okna i drzwi", description: "Stolarka okienna i drzwiowa", cost: 0, order_index: 3, group_label: "Stan surowy zamknięty" },
      { stage_name: "Tynki", description: "Tynki wewnętrzne i zewnętrzne", cost: 0, order_index: 4, group_label: "Stan deweloperski" },
      { stage_name: "Posadzki", description: "Wylewki, posadzki", cost: 0, order_index: 5, group_label: "Stan deweloperski" },
      { stage_name: "Instalacje końcowe", description: "Montaż instalacji końcowych", cost: 0, order_index: 6, group_label: "Stan deweloperski" },
      { stage_name: "Odbiór", description: "Prace końcowe i odbiór", cost: 0, order_index: 7, group_label: "Zakończenie" },
    ],
  },
  renovation: {
    name: "Kosztorys remontu",
    description: "Szczegółowy kosztorys prac remontowych z podziałem na pomieszczenia",
    category: "project_type",
    defaultVatRate: 8,
    stages: [
      { stage_name: "Demontaż", description: "Rozbiórka starych elementów, wywóz gruzu", cost: 0, order_index: 0, group_label: "Przygotowanie" },
      { stage_name: "Przygotowanie powierzchni", description: "Oczyszczanie, wyrównywanie, gruntowanie", cost: 0, order_index: 1, group_label: "Przygotowanie" },
      { stage_name: "Instalacje elektryczne", description: "Prace elektryczne, gniazda, oświetlenie", cost: 0, order_index: 2, group_label: "Instalacje" },
      { stage_name: "Instalacje hydrauliczne", description: "Woda, kanalizacja, gaz", cost: 0, order_index: 3, group_label: "Instalacje" },
      { stage_name: "Tynki i ściany", description: "Tynkowanie, gipsowanie, malowanie", cost: 0, order_index: 4, group_label: "Ściany i sufity" },
      { stage_name: "Sufity", description: "Sufity podwieszane, naprawa", cost: 0, order_index: 5, group_label: "Ściany i sufity" },
      { stage_name: "Posadzki", description: "Wylewki, płytki, panele", cost: 0, order_index: 6, group_label: "Podłogi" },
      { stage_name: "Łazienka", description: "Glazura, armatura, sanitariat", cost: 0, order_index: 7, group_label: "Łazienka" },
      { stage_name: "Kuchnia", description: "Meble, sprzęt AGD, instalacje", cost: 0, order_index: 8, group_label: "Kuchnia" },
      { stage_name: "Drzwi i okna", description: "Montaż drzwi wewnętrznych i zewnętrznych", cost: 0, order_index: 9, group_label: "Stolarka" },
      { stage_name: "Wykończenie", description: "Prace końcowe, czyszczenie", cost: 0, order_index: 10, group_label: "Zakończenie" },
    ],
  },
  new_construction: {
    name: "Kosztorys nowego budynku",
    description: "Kompleksowy kosztorys budowy od fundamentów do stanu deweloperskiego",
    category: "project_type",
    defaultVatRate: 8,
    stages: [
      { stage_name: "Roboty ziemne", description: "Wykopy, niwelacja terenu", cost: 0, order_index: 0, group_label: "Fundamenty" },
      { stage_name: "Fundamenty", description: "Ławy fundamentowe, ściany fundamentowe, izolacja", cost: 0, order_index: 1, group_label: "Fundamenty" },
      { stage_name: "Ściany zewnętrzne", description: "Murowanie ścian zewnętrznych", cost: 0, order_index: 2, group_label: "Konstrukcja" },
      { stage_name: "Ściany wewnętrzne", description: "Murowanie ścian działowych", cost: 0, order_index: 3, group_label: "Konstrukcja" },
      { stage_name: "Stropy", description: "Stropy żelbetowe", cost: 0, order_index: 4, group_label: "Konstrukcja" },
      { stage_name: "Dach", description: "Konstrukcja dachu, pokrycie, obróbki", cost: 0, order_index: 5, group_label: "Dach" },
      { stage_name: "Instalacje w ścianach", description: "Instalacje w ścianach i podłogach", cost: 0, order_index: 6, group_label: "Instalacje" },
      { stage_name: "Okna i drzwi", description: "Stolarka okienna i drzwiowa", cost: 0, order_index: 7, group_label: "Stolarka" },
      { stage_name: "Tynki zewnętrzne", description: "Tynki, elewacja", cost: 0, order_index: 8, group_label: "Elewacja" },
      { stage_name: "Tynki wewnętrzne", description: "Tynki wewnętrzne", cost: 0, order_index: 9, group_label: "Wykończenie" },
      { stage_name: "Posadzki", description: "Wylewki posadzkowe", cost: 0, order_index: 10, group_label: "Wykończenie" },
      { stage_name: "Instalacje końcowe", description: "Montaż instalacji końcowych", cost: 0, order_index: 11, group_label: "Wykończenie" },
      { stage_name: "Odbiór", description: "Prace końcowe i odbiór", cost: 0, order_index: 12, group_label: "Zakończenie" },
    ],
  },
  commercial: {
    name: "Kosztorys obiektu komercyjnego",
    description: "Profesjonalny kosztorys dla powierzchni biurowych, handlowych i usługowych",
    category: "project_type",
    defaultVatRate: 23,
    stages: [
      { stage_name: "Adaptacja pomieszczeń", description: "Przygotowanie pomieszczeń do adaptacji", cost: 0, order_index: 0, group_label: "Przygotowanie" },
      { stage_name: "Ścianki działowe", description: "Budowa ścianek działowych", cost: 0, order_index: 1, group_label: "Konstrukcja" },
      { stage_name: "Sufity podwieszane", description: "Sufity podwieszane z oświetleniem", cost: 0, order_index: 2, group_label: "Wykończenie" },
      { stage_name: "Posadzki", description: "Posadzki biurowe/handlowe", cost: 0, order_index: 3, group_label: "Wykończenie" },
      { stage_name: "Instalacje elektryczne", description: "Instalacje elektryczne, sieci komputerowe", cost: 0, order_index: 4, group_label: "Instalacje" },
      { stage_name: "Instalacje HVAC", description: "Klimatyzacja, wentylacja, ogrzewanie", cost: 0, order_index: 5, group_label: "Instalacje" },
      { stage_name: "Systemy bezpieczeństwa", description: "Monitoring, kontrola dostępu", cost: 0, order_index: 6, group_label: "Instalacje" },
      { stage_name: "Wykończenie", description: "Malowanie, detale wykończeniowe", cost: 0, order_index: 7, group_label: "Wykończenie" },
      { stage_name: "Meble i wyposażenie", description: "Meble biurowe/regałowe", cost: 0, order_index: 8, group_label: "Wyposażenie" },
    ],
  },
  industrial: {
    name: "Kosztorys obiektu przemysłowego",
    description: "Specjalistyczny kosztorys dla hal produkcyjnych, magazynów i obiektów przemysłowych",
    category: "project_type",
    defaultVatRate: 23,
    stages: [
      { stage_name: "Roboty ziemne", description: "Wykopy pod fundamenty przemysłowe", cost: 0, order_index: 0, group_label: "Fundamenty" },
      { stage_name: "Fundamenty przemysłowe", description: "Fundamenty pod maszyny i konstrukcje", cost: 0, order_index: 1, group_label: "Fundamenty" },
      { stage_name: "Konstrukcja stalowa", description: "Konstrukcja hali, słupy, rygle", cost: 0, order_index: 2, group_label: "Konstrukcja" },
      { stage_name: "Obudowa hali", description: "Płyty warstwowe, blacha trapezowa", cost: 0, order_index: 3, group_label: "Obudowa" },
      { stage_name: "Posadzki przemysłowe", description: "Posadzki odporne na obciążenia", cost: 0, order_index: 4, group_label: "Podłogi" },
      { stage_name: "Bramy i drzwi", description: "Bramy przemysłowe, drzwi", cost: 0, order_index: 5, group_label: "Stolarka" },
      { stage_name: "Instalacje przemysłowe", description: "Media techniczne, sprężarkownia", cost: 0, order_index: 6, group_label: "Instalacje" },
      { stage_name: "Wentylacja przemysłowa", description: "Systemy wentylacji i odpylania", cost: 0, order_index: 7, group_label: "Instalacje" },
      { stage_name: "Oświetlenie przemysłowe", description: "Oświetlenie hali", cost: 0, order_index: 8, group_label: "Instalacje" },
      { stage_name: "Systemy bezpieczeństwa", description: "PPOŻ, monitoring", cost: 0, order_index: 9, group_label: "Bezpieczeństwo" },
    ],
  },
  infrastructure: {
    name: "Kosztorys infrastruktury",
    description: "Kosztorys prac infrastrukturalnych: drogi, sieci, uzbrojenie terenu",
    category: "project_type",
    defaultVatRate: 23,
    stages: [
      { stage_name: "Roboty ziemne", description: "Wykopy, niwelacja terenu", cost: 0, order_index: 0, group_label: "Przygotowanie" },
      { stage_name: "Podbudowa drogowa", description: "Warstwy podbudowy pod drogi", cost: 0, order_index: 1, group_label: "Drogi" },
      { stage_name: "Nawierzchnia", description: "Asfalt, kostka brukowa, płyty betonowe", cost: 0, order_index: 2, group_label: "Drogi" },
      { stage_name: "Chodniki i zjazdy", description: "Chodniki, zjazdy, krawężniki", cost: 0, order_index: 3, group_label: "Drogi" },
      { stage_name: "Sieci wodociągowe", description: "Woda, hydranty", cost: 0, order_index: 4, group_label: "Sieci" },
      { stage_name: "Sieci kanalizacyjne", description: "Kanalizacja sanitarna i deszczowa", cost: 0, order_index: 5, group_label: "Sieci" },
      { stage_name: "Sieci energetyczne", description: "Prąd, oświetlenie zewnętrzne", cost: 0, order_index: 6, group_label: "Sieci" },
      { stage_name: "Sieci telekomunikacyjne", description: "Telefon, internet", cost: 0, order_index: 7, group_label: "Sieci" },
      { stage_name: "Zieleń", description: "Zakładanie zieleni, trawniki", cost: 0, order_index: 8, group_label: "Zieleń" },
      { stage_name: "Oznakowanie", description: "Znaki drogowe, oznakowanie terenu", cost: 0, order_index: 9, group_label: "Zakończenie" },
    ],
  },
  knr_standard: {
    name: "Kosztorys KNR (standard)",
    description: "Oficjalny kosztorys zgodny z normami KNR dla przetargów publicznych",
    category: "method",
    defaultVatRate: 23,
    stages: [
      { stage_name: "Roboty ziemne", description: "KNR 1-01", cost: 0, order_index: 0 },
      { stage_name: "Roboty fundamentowe", description: "KNR 2-01", cost: 0, order_index: 1 },
      { stage_name: "Roboty murowe", description: "KNR 2-02", cost: 0, order_index: 2 },
      { stage_name: "Roboty zbrojeniowe i betoniarskie", description: "KNR 2-03", cost: 0, order_index: 3 },
      { stage_name: "Roboty stolarskie", description: "KNR 2-04", cost: 0, order_index: 4 },
      { stage_name: "Roboty dekarskie", description: "KNR 2-05", cost: 0, order_index: 5 },
      { stage_name: "Roboty izolacyjne", description: "KNR 2-06", cost: 0, order_index: 6 },
      { stage_name: "Roboty malarskie", description: "KNR 2-07", cost: 0, order_index: 7 },
      { stage_name: "Roboty posadzkarskie", description: "KNR 4-01", cost: 0, order_index: 8 },
      { stage_name: "Roboty instalacyjne", description: "KNR 3-01, 3-02", cost: 0, order_index: 9 },
    ],
  },
  knr_simplified: {
    name: "Kosztorys KNR (uproszczony)",
    description: "Uproszczony kosztorys KNR dla małych projektów i klientów prywatnych",
    category: "method",
    defaultVatRate: 8,
    stages: [
      { stage_name: "Roboty przygotowawcze", description: "Przygotowanie placu budowy", cost: 0, order_index: 0 },
      { stage_name: "Roboty ziemne i fundamentowe", description: "Wykopy i fundamenty", cost: 0, order_index: 1 },
      { stage_name: "Roboty murowe i konstrukcyjne", description: "Ściany i stropy", cost: 0, order_index: 2 },
      { stage_name: "Roboty wykończeniowe", description: "Tynki, podłogi, malowanie", cost: 0, order_index: 3 },
      { stage_name: "Roboty instalacyjne", description: "Elektryka, hydraulika", cost: 0, order_index: 4 },
      { stage_name: "Roboty zewnętrzne", description: "Dach, elewacja", cost: 0, order_index: 5 },
    ],
  },
  material_labor: {
    name: "Kosztorys materiał + robocizna",
    description: "Szczegółowy podział na materiały i robociznę dla pełnej transparacji kosztów",
    category: "method",
    defaultVatRate: 23,
    stages: [
      { stage_name: "Materiały - roboty ziemne", description: "Piasek, żwir, beton", cost: 0, order_index: 0, group_label: "Materiały" },
      { stage_name: "Robocizna - roboty ziemne", description: "Kopanie, zacieranie", cost: 0, order_index: 1, group_label: "Robocizna" },
      { stage_name: "Materiały - fundamenty", description: "Cement, stal zbrojeniowa", cost: 0, order_index: 2, group_label: "Materiały" },
      { stage_name: "Robocizna - fundamenty", description: "Zbrojenie, betonowanie", cost: 0, order_index: 3, group_label: "Robocizna" },
      { stage_name: "Materiały - ściany", description: "Cegła, pustaki, zaprawa", cost: 0, order_index: 4, group_label: "Materiały" },
      { stage_name: "Robocizna - ściany", description: "Murowanie", cost: 0, order_index: 5, group_label: "Robocizna" },
      { stage_name: "Materiały - wykończenie", description: "Tynki, farby, podłogi", cost: 0, order_index: 6, group_label: "Materiały" },
      { stage_name: "Robocizna - wykończenie", description: "Tynkowanie, malowanie", cost: 0, order_index: 7, group_label: "Robocizna" },
    ],
  },
  public_sector: {
    name: "Kosztorys sektora publicznego",
    description: "Oficjalny kosztorys zgodny z wymogami zamówień publicznych",
    category: "sector",
    defaultVatRate: 23,
    stages: [
      { stage_name: "Przygotowanie dokumentacji", description: "Projekty, pozwolenia, uzgodnienia", cost: 0, order_index: 0, group_label: "Dokumentacja" },
      { stage_name: "Roboty ziemne", description: "Roboty ziemne zgodne z projektem", cost: 0, order_index: 1, group_label: "Roboty budowlane" },
      { stage_name: "Fundamenty", description: "Roboty fundamentowe", cost: 0, order_index: 2, group_label: "Roboty budowlane" },
      { stage_name: "Konstrukcja", description: "Konstrukcja budowlana", cost: 0, order_index: 3, group_label: "Roboty budowlane" },
      { stage_name: "Instalacje", description: "Wszystkie instalacje", cost: 0, order_index: 4, group_label: "Instalacje" },
      { stage_name: "Wykończenie", description: "Prace wykończeniowe", cost: 0, order_index: 5, group_label: "Roboty budowlane" },
      { stage_name: "Protokoły odbioru", description: "Protokoły częściowe i końcowe", cost: 0, order_index: 6, group_label: "Dokumentacja" },
      { stage_name: "Dokumentacja powykonawcza", description: "Dokumentacja powykonawcza", cost: 0, order_index: 7, group_label: "Dokumentacja" },
    ],
  },
  private_client: {
    name: "Kosztorys dla klienta prywatnego",
    description: "Prosty i przejrzysty kosztorys dla osób prywatnych",
    category: "sector",
    defaultVatRate: 8,
    stages: [
      { stage_name: "Przygotowanie", description: "Przygotowanie do prac", cost: 0, order_index: 0 },
      { stage_name: "Główne prace", description: "Główne prace remontowe/budowlane", cost: 0, order_index: 1 },
      { stage_name: "Wykończenie", description: "Prace wykończeniowe", cost: 0, order_index: 2 },
      { stage_name: "Sprzątanie i odbiór", description: "Sprzątanie po pracach, odbiór", cost: 0, order_index: 3 },
    ],
  },
};

export function getTemplatePreset(template: OfferTemplateType): TemplatePreset {
  return TEMPLATE_PRESETS[template];
}

export function getTemplatesByCategory(category: TemplatePreset["category"]): TemplatePreset[] {
  return Object.values(TEMPLATE_PRESETS).filter(t => t.category === category);
}
