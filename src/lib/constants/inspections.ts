import type { InspectionCategory, InspectionItem } from "@/lib/actions/inspections";

export const BUILT_IN_TEMPLATES: Record<string, {
  name: string;
  category: InspectionCategory;
  items: Omit<InspectionItem, "result" | "value" | "notes">[];
}> = {
  beton_fundamenty: {
    name: "Kontrola betonu — fundamenty",
    category: "quality",
    items: [
      { id: "b1", question: "Czy klasa betonu jest zgodna z projektem?", required: true, type: "pass_fail" },
      { id: "b2", question: "Czy grubość otuliny zbrojenia jest zachowana (min. 5 cm)?", required: true, type: "pass_fail" },
      { id: "b3", question: "Czy beton jest jednorodny, bez rys i kawern?", required: true, type: "pass_fail" },
      { id: "b4", question: "Czy powierzchnia betonu jest wolna od zanieczyszczeń?", required: true, type: "pass_fail" },
      { id: "b5", question: "Wynik próby wytrzymałości na ściskanie (MPa)", required: false, type: "number" },
      { id: "b6", question: "Czy uszczelnienie styków szalunkowych było prawidłowe?", required: true, type: "pass_fail" },
    ],
  },
  bhp_codzienna: {
    name: "Odprawa BHP — codzienna kontrola placu budowy",
    category: "safety",
    items: [
      { id: "s1", question: "Czy pracownicy mają kaski ochronne?", required: true, type: "pass_fail" },
      { id: "s2", question: "Czy pracownicy mają kamizelki odblaskowe?", required: true, type: "pass_fail" },
      { id: "s3", question: "Czy strefy niebezpieczne są odgrodzone i oznakowane?", required: true, type: "pass_fail" },
      { id: "s4", question: "Czy rusztowania mają balustrady i podsadki?", required: true, type: "pass_fail" },
      { id: "s5", question: "Czy drogi ewakuacyjne są wolne?", required: true, type: "pass_fail" },
      { id: "s6", question: "Czy sprzęt elektryczny jest w dobrym stanie?", required: true, type: "pass_fail" },
      { id: "s7", question: "Czy apteczka pierwszej pomocy jest dostępna?", required: true, type: "pass_fail" },
      { id: "s8", question: "Liczba pracowników na budowie", required: false, type: "number" },
    ],
  },
  odbiory_mieszkania: {
    name: "Protokół odbioru — mieszkanie / lokal",
    category: "handover",
    items: [
      { id: "o1", question: "Ściany — tynki, gładzie: brak uszkodzeń i nierówności?", required: true, type: "pass_fail" },
      { id: "o2", question: "Podłogi — posadzki: brak zarysowań, pęknięć, nierówności?", required: true, type: "pass_fail" },
      { id: "o3", question: "Okna — działanie skrzydeł, uszczelki, szyby: OK?", required: true, type: "pass_fail" },
      { id: "o4", question: "Drzwi — działanie, zamki, ościeżnice: OK?", required: true, type: "pass_fail" },
      { id: "o5", question: "Instalacja elektryczna — gniazdka, łączniki, licznik: sprawdzono?", required: true, type: "pass_fail" },
      { id: "o6", question: "Instalacja sanitarna — cieknięcia, drożność, odpływy: OK?", required: true, type: "pass_fail" },
      { id: "o7", question: "Ogrzewanie — grzejniki, zawory, temperatura: sprawdzono?", required: true, type: "pass_fail" },
      { id: "o8", question: "Balkon/taras — obróbki, odpływy, balustrada: OK?", required: false, type: "pass_fail" },
      { id: "o9", question: "Wentylacja — ciąg w łazience i kuchni: OK?", required: true, type: "pass_fail" },
      { id: "o10", question: "Uwagi dodatkowe", required: false, type: "text" },
    ],
  },
  roboty_elektryczne: {
    name: "Kontrola robót elektrycznych",
    category: "quality",
    items: [
      { id: "e1", question: "Czy przekroje przewodów są zgodne z projektem?", required: true, type: "pass_fail" },
      { id: "e2", question: "Czy trasy kablowe są oznakowane?", required: true, type: "pass_fail" },
      { id: "e3", question: "Czy rozdzielnica jest zgodna z projektem?", required: true, type: "pass_fail" },
      { id: "e4", question: "Czy pomiary rezystancji izolacji wykonano? Wynik (MΩ)", required: true, type: "number" },
      { id: "e5", question: "Czy uziemienie jest wykonane poprawnie?", required: true, type: "pass_fail" },
      { id: "e6", question: "Czy ochrona przeciwporażeniowa jest zapewniona?", required: true, type: "pass_fail" },
    ],
  },
};
