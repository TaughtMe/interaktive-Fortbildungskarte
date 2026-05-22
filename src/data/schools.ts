import type { School, SchoolType, SchoolFortbildungen } from '@/types';
import type { TrainingNeed } from '@/types/trainingNeed';

export const SCHULTYPEN: Record<string, SchoolType> = {
  G:  { key: 'G',  label: 'Grundschule',             short: 'GS',  color: 'var(--type-g)'  },
  M:  { key: 'M',  label: 'Mittelschule',             short: 'MS',  color: 'var(--type-m)'  },
  GM: { key: 'GM', label: 'Grund- und Mittelschule',  short: 'GMS', color: 'var(--type-gm)' },
};

function s(o: Omit<School, 'fax' | 'web' | 'leitung'> & Partial<Pick<School, 'fax' | 'web' | 'leitung'>>): School {
  return { fax: '', web: '', leitung: '—', ...o };
}

export const SCHULEN: School[] = [
  // --- Babenhausen ---
  s({ id: 'bb-gs',  name: 'Grundschule Babenhausen',          ort: 'Babenhausen',      typ: 'G',  lat: 48.1518, lng: 10.2452, adresse: 'Pestalozzistraße 10, 87727 Babenhausen',         tel: '08333 4710',    fax: '08333 95518',  mail: 'sekretariat@gs-babenhausen.de' }),
  s({ id: 'bb-ms',  name: 'Mittelschule Babenhausen',         ort: 'Babenhausen',      typ: 'M',  lat: 48.1506, lng: 10.2438, adresse: 'Pestalozzistraße 7, 87727 Babenhausen',          tel: '08333 923480',  fax: '08333 9234842', mail: 'verwaltung@mittelschule-babenhausen.de',  web: 'mittelschule-babenhausen.de' }),

  // --- Bad Grönenbach ---
  s({ id: 'bg-gs',  name: 'Sebastian-Kneipp-Grundschule Bad Grönenbach',   ort: 'Bad Grönenbach', typ: 'G',  lat: 47.8725, lng: 10.2306, adresse: 'Kemptener Straße 7, 87730 Bad Grönenbach', tel: '08334 986055', fax: '08334 9237', mail: 'sekretariat@sksbg.de', web: 'sksbg.de' }),
  s({ id: 'bg-ms',  name: 'Sebastian-Kneipp-Mittelschule Bad Grönenbach',  ort: 'Bad Grönenbach', typ: 'M',  lat: 47.8719, lng: 10.2314, adresse: 'Kemptener Straße 7, 87730 Bad Grönenbach', tel: '08334 986055', fax: '08334 9237', mail: 'sekretariat@sksbg.de', web: 'sksbg.de' }),

  // --- Bad Wörishofen ---
  s({ id: 'bw-gs',  name: 'Pfarrer-Kneipp-Grundschule Bad Wörishofen',   ort: 'Bad Wörishofen', typ: 'G',  lat: 48.0090, lng: 10.6020, adresse: 'Kaufbeurer Straße 12, 86825 Bad Wörishofen', tel: '08247 9653-0', fax: '08247 9653-130', mail: 'info@pfarrer-kneipp-schule.de', web: 'pksbw.de' }),
  s({ id: 'bw-ms',  name: 'Pfarrer-Kneipp-Mittelschule Bad Wörishofen',  ort: 'Bad Wörishofen', typ: 'M',  lat: 48.0084, lng: 10.6028, adresse: 'Kaufbeurer Straße 12, 86825 Bad Wörishofen', tel: '08247 9653-0', fax: '08247 9653-130', mail: 'info@pfarrer-kneipp-schule.de', web: 'pksbw.de' }),

  // --- Benningen ---
  s({ id: 'be-gs',  name: 'Grundschule Benningen-Lachen',   ort: 'Benningen',  typ: 'G',  lat: 47.9650, lng: 10.2495, adresse: 'Hawanger Straße 2, 87734 Benningen',      tel: '08331 3423',   fax: '08331 990194', mail: 'schule@benningen-allgaeu.de' }),

  // --- Boos ---
  s({ id: 'bo-gs',  name: 'Dominikus-Hertel-Grundschule Boos', ort: 'Boos',    typ: 'G',  lat: 48.0115, lng: 10.2620, adresse: 'Jahnstraße 7, 87737 Boos',               tel: '08335 428',    fax: '08335 989774', mail: 'verwaltung@schule-boos.bayern' }),

  // --- Buxheim ---
  s({ id: 'bu-gs',  name: 'Grundschule Buxheim',   ort: 'Buxheim',    typ: 'G',  lat: 47.9985, lng: 10.1318, adresse: 'Wiesenstraße 7, 87740 Buxheim',            tel: '08331 64227',  fax: '08331 9256022', mail: 'grundschule-buxheim@t-online.de', web: 'grundschule-buxheim.de' }),

  // --- Dirlewang ---
  s({ id: 'di-gs',  name: 'Grundschule Dirlewang', ort: 'Dirlewang',  typ: 'G',  lat: 48.0300, lng: 10.4185, adresse: 'Marktstraße 23, 87742 Dirlewang',           tel: '08267 90019',  fax: '08267 90029', mail: 'sekretariat@grundschule-dirlewang.de', web: 'grundschule-dirlewang.de' }),

  // --- Egg a.d.Günz ---
  s({ id: 'eg-gs',  name: 'Grundschule Egg a. d. Günz', ort: 'Egg a. d. Günz', typ: 'G', lat: 48.0690, lng: 10.2860, adresse: 'Dr.-Eck-Platz 1, 87743 Egg a. d. Günz', tel: '08333 4797', fax: '08333 934744', mail: 'sekretariat@grundschule-egg.de' }),

  // --- Erkheim ---
  s({ id: 'er-gs',  name: 'Grundschule Erkheim',   ort: 'Erkheim',    typ: 'G',  lat: 48.0146, lng: 10.3170, adresse: 'Schulweg 1, 87746 Erkheim',                tel: '08336 393',    fax: '08336 80618', mail: 'info@schule-erkheim.de', web: 'schule-erkheim.de' }),
  s({ id: 'er-ms',  name: 'Mittelschule Erkheim',  ort: 'Erkheim',    typ: 'M',  lat: 48.0140, lng: 10.3178, adresse: 'Schulweg 1, 87746 Erkheim',                tel: '08336 393',    fax: '08336 80618', mail: 'info@schule-erkheim.de', web: 'schule-erkheim.de' }),

  // --- Ettringen ---
  s({ id: 'et-gs',  name: 'Albert-Schweitzer-Grundschule Ettringen',  ort: 'Ettringen', typ: 'G',  lat: 48.0940, lng: 10.7170, adresse: 'Schulstraße 10, 86833 Ettringen', tel: '08249 1535', fax: '08249 1829', mail: 'verwaltung@schule.ettringen.de', web: 'schule-ettringen.de' }),
  s({ id: 'et-ms',  name: 'Albert-Schweitzer-Mittelschule Ettringen', ort: 'Ettringen', typ: 'M',  lat: 48.0934, lng: 10.7178, adresse: 'Schulstraße 10, 86833 Ettringen', tel: '08249 1535', fax: '08249 1829', mail: 'verwaltung@schule.ettringen.de', web: 'schule-ettringen.de' }),

  // --- Heimertingen ---
  s({ id: 'he-gs',  name: 'Grundschule Heimertingen', ort: 'Heimertingen', typ: 'G', lat: 48.0050, lng: 10.1180, adresse: 'Sechsbaumweg 5, 87751 Heimertingen', tel: '08335 1003', fax: '08335 986270', mail: 'gs-heimertingen@t-online.de', web: 'gs-heimertingen.de' }),

  // --- Kronburg-Illerbeuren ---
  s({ id: 'il-gs',  name: 'Grundschule Illerbeuren', ort: 'Kronburg-Illerbeuren', typ: 'G', lat: 47.8252, lng: 10.1310, adresse: 'Anton-Hohl-Straße 2, 87758 Kronburg-Illerbeuren', tel: '08394 269', fax: '08394 265', mail: 'info@schule-illerbeuren.de', web: 'schule-illerbeuren.de' }),

  // --- Kammlach ---
  s({ id: 'ka-gs',  name: 'Grundschule Kammlach', ort: 'Kammlach', typ: 'G', lat: 48.0610, lng: 10.5230, adresse: 'Obere Hauptstraße 56, 87754 Kammlach', tel: '08261 6117', fax: '08261 763993', mail: 'grundschule.kammlach@t-online.de' }),

  // --- Kettershausen ---
  s({ id: 'ke-gs',  name: 'Grundschule Kettershausen', ort: 'Kettershausen', typ: 'G', lat: 48.1392, lng: 10.3140, adresse: 'Schulstraße 4, 86498 Kettershausen', tel: '08333 662', fax: '08333 9469015', mail: 'schulleitung@gs-kettershausen.de' }),

  // --- Kirchheim ---
  s({ id: 'ki-gs',  name: 'Grundschule Kirchheim',  ort: 'Kirchheim i. Schw.', typ: 'G',  lat: 48.1440, lng: 10.4644, adresse: 'Angerweg 10, 87757 Kirchheim i. Schw.', tel: '08266 346', fax: '08266 869971', mail: 'verwaltung@gsmsk.de', web: 'grund-und-mittelschule-kirchheim-schwaben.de' }),
  s({ id: 'ki-ms',  name: 'Mittelschule Kirchheim', ort: 'Kirchheim i. Schw.', typ: 'M',  lat: 48.1434, lng: 10.4652, adresse: 'Angerweg 10, 87757 Kirchheim i. Schw.', tel: '08266 346', fax: '08266 869971', mail: 'verwaltung@gsmsk.de', web: 'grund-und-mittelschule-kirchheim-schwaben.de' }),

  // --- Legau ---
  s({ id: 'le-gs',  name: 'Grundschule Legau',  ort: 'Legau', typ: 'G',  lat: 47.8512, lng: 10.1245, adresse: 'Altusrieder Straße 13, 87764 Legau', tel: '08330 507', fax: '08330 517', mail: 'verw@schule-legau.de', web: 'schule-legau.de' }),
  s({ id: 'le-ms',  name: 'Mittelschule Legau', ort: 'Legau', typ: 'M',  lat: 47.8506, lng: 10.1253, adresse: 'Altusrieder Straße 13, 87764 Legau', tel: '08330 507', fax: '08330 517', mail: 'verw@schule-legau.de', web: 'schule-legau.de' }),

  // --- Markt Rettenbach ---
  s({ id: 'mr-gs',  name: 'Grundschule Markt Rettenbach',  ort: 'Markt Rettenbach', typ: 'G',  lat: 47.9400, lng: 10.3710, adresse: 'Schulstraße 26, 87733 Markt Rettenbach', tel: '08392 363', fax: '08392 8070', mail: 'info@schulen-markt-rettenbach.de', web: 'schulen-markt-rettenbach.de' }),
  s({ id: 'mr-ms',  name: 'Mittelschule Markt Rettenbach', ort: 'Markt Rettenbach', typ: 'M',  lat: 47.9394, lng: 10.3718, adresse: 'Schulstraße 26, 87733 Markt Rettenbach', tel: '08392 363', fax: '08392 8070', mail: 'info@schulen-markt-rettenbach.de', web: 'schulen-markt-rettenbach.de' }),

  // --- Markt Wald ---
  s({ id: 'mw-gs',  name: 'Christoph-Scheiner-Grundschule Markt Wald', ort: 'Markt Wald', typ: 'G', lat: 48.1420, lng: 10.5780, adresse: 'Schnerzhofer Straße 18, 86865 Markt Wald', tel: '08262 870', fax: '08262 968218', mail: 'gs.markt-wald@t-online.de' }),

  // --- Memmingerberg ---
  s({ id: 'mb-gms', name: 'Grund- und Mittelschule Memmingerberg', ort: 'Memmingerberg', typ: 'GM', lat: 47.9920, lng: 10.2305, adresse: 'August-Hederer-Straße 11, 87766 Memmingerberg', tel: '08331 9470-0', fax: '08331 947020', mail: 'Schule-Memmingerberg@t-online.de', web: 'schule-memmingerberg.com' }),

  // --- Mindelheim ---
  s({ id: 'mi-gs',    name: 'Grundschule Mindelheim',                              ort: 'Mindelheim', typ: 'G', lat: 48.0428, lng: 10.4848, adresse: 'Brennerstr. 3, 87719 Mindelheim',       tel: '08261 76351-0', fax: '08261 76351-29', mail: 'grundschule@mindelheim.de',              web: 'grundschule-mindelheim.de' }),
  s({ id: 'mi-ms',    name: 'Mittelschule Mindelheim',                             ort: 'Mindelheim', typ: 'M', lat: 48.0422, lng: 10.4856, adresse: 'Brennerstr. 5, 87719 Mindelheim',       tel: '08261 90962-0', fax: '08261 90962-29', mail: 'mittelschule@mindelheim.de',             web: 'ms-mindelheim.de' }),
  s({ id: 'mi-josef', name: 'St.-Josef-Schule Mindelheim (Kath. Freie Grundschule)', ort: 'Mindelheim', typ: 'G', lat: 48.0445, lng: 10.4905, adresse: 'Champagnatplatz 1, 87719 Mindelheim', tel: '0821 4558-10900', fax: '0821 4558-10909', mail: 'sekretariat@st-josef-grundschule.de', web: 'st-josef-grundschule.de' }),

  // --- Ottobeuren ---
  s({ id: 'ot-gs',  name: 'Grundschule Ottobeuren',  ort: 'Ottobeuren', typ: 'G',  lat: 47.9446, lng: 10.2965, adresse: 'Bergstraße 78, 87724 Ottobeuren', tel: '08332 922430', fax: '08332 922440', mail: 'sekretariat@gs-ottobeuren.de' }),
  s({ id: 'ot-ms',  name: 'Mittelschule Ottobeuren', ort: 'Ottobeuren', typ: 'M',  lat: 47.9440, lng: 10.2973, adresse: 'Bergstraße 80, 87724 Ottobeuren', tel: '08332 922450', fax: '08332 922460', mail: 'info@mittelschule-ottobeuren.de', web: 'mittelschule-ottobeuren.de' }),

  // --- Pfaffenhausen ---
  s({ id: 'pf-gs',  name: 'Grundschule Pfaffenhausen',  ort: 'Pfaffenhausen', typ: 'G',  lat: 48.1042, lng: 10.4218, adresse: 'Schulstraße 9, 87772 Pfaffenhausen', tel: '08265 411', fax: '08265 730886', mail: 'verwaltung@gs-ms-pfaffenhausen.de', web: 'gs-ms-pfaffenhausen.de' }),
  s({ id: 'pf-ms',  name: 'Mittelschule Pfaffenhausen', ort: 'Pfaffenhausen', typ: 'M',  lat: 48.1036, lng: 10.4226, adresse: 'Schulstraße 9, 87772 Pfaffenhausen', tel: '08265 411', fax: '08265 730886', mail: 'verwaltung@gs-ms-pfaffenhausen.de', web: 'gs-ms-pfaffenhausen.de' }),

  // --- Sontheim ---
  s({ id: 'so-gs',  name: 'Grundschule Sontheim', ort: 'Sontheim', typ: 'G', lat: 47.9640, lng: 10.3550, adresse: 'Hauptstraße 41, 87776 Sontheim', tel: '08336 1237', fax: '08336 805750', mail: 'sekretariat@grundschule-sontheim.de', web: 'grundschule-sontheim.de' }),

  // --- Tussenhausen ---
  s({ id: 'tu-gs',  name: 'Grundschule Tussenhausen', ort: 'Tussenhausen', typ: 'G', lat: 48.1110, lng: 10.5980, adresse: 'Marktplatz 4, 86874 Tussenhausen', tel: '08268 378', fax: '08268 904771', mail: '8885.sekretariat@schule.bayern.de', web: 'gs-tussenhausen.de' }),

  // --- Türkheim ---
  s({ id: 'tk-ms',  name: 'Ludwig-Aurbacher-Mittelschule Türkheim', ort: 'Türkheim', typ: 'M', lat: 48.0608, lng: 10.6378, adresse: 'Oberjägerstraße 7, 86842 Türkheim',  tel: '08245 657', fax: '08245 3265', mail: 'schulleitung@mittelschule-tuerkheim.de', web: 'mittelschule-tuerkheim.de' }),
  s({ id: 'tk-gs',  name: 'Grundschule Türkheim',                   ort: 'Türkheim', typ: 'G', lat: 48.0614, lng: 10.6364, adresse: 'Wörishofer Straße 5, 86842 Türkheim', tel: '08245 656', fax: '08245 3457', mail: 'info@gs-tuerkheim.de',                 web: 'gs-tuerkheim.de' }),

  // --- Westerheim ---
  s({ id: 'we-gs',  name: 'Grundschule Westerheim', ort: 'Westerheim', typ: 'G', lat: 47.9890, lng: 10.3490, adresse: 'Bahnhofstr. 2, 87784 Westerheim', tel: '08336 809188', fax: '08336 809187', mail: 'gswesterheim@t-online.de', web: 'cms.schule-westerheim.de' }),

  // --- Wiedergeltingen ---
  s({ id: 'wi-gs',  name: 'Grundschule Wiedergeltingen', ort: 'Wiedergeltingen', typ: 'G', lat: 48.0750, lng: 10.6225, adresse: 'Mindelheimer Str. 26, 86879 Wiedergeltingen', tel: '08241 2790', fax: '08241 960683', mail: 'grundschule@wiedergeltingen.de' }),

  // --- Wolfertschwenden ---
  s({ id: 'wo-gs',  name: 'Grundschule Wolfertschwenden', ort: 'Wolfertschwenden', typ: 'G', lat: 47.9110, lng: 10.2720, adresse: 'Am Sportplatz 7, 87787 Wolfertschwenden', tel: '08334 1750', fax: '08334 1775', mail: 'schule@wolfertschwenden.de' }),

  // --- Woringen ---
  s({ id: 'wr-gs',  name: 'Grundschule Woringen', ort: 'Woringen', typ: 'G', lat: 47.9450, lng: 10.2140, adresse: 'Kempter Straße 10, 87789 Woringen', tel: '08331 86810', fax: '08331 983380', mail: 'schule@woringen.de' }),

  // ===== Stadt Memmingen =====
  s({ id: 'mm-bismarck',  name: 'Bismarckschule, Mittelschule Memmingen',          ort: 'Memmingen',               typ: 'M', lat: 47.9866, lng: 10.1832, adresse: 'St.-Josefs-Kirchplatz 1, 87700 Memmingen', tel: '08331 965201',   fax: '08331 965279',    mail: 'verwaltung@bismk-mm.de',                        web: 'bismarckschule-mm.de' }),
  s({ id: 'mm-elsbethen', name: 'Elsbethenschule, Grundschule Memmingen',          ort: 'Memmingen',               typ: 'G', lat: 47.9872, lng: 10.1840, adresse: 'St.-Josefs-Kirchplatz 3, 87700 Memmingen', tel: '08331 7850590',  fax: '08331 78505999',  mail: 'sekretariat@elsbethenschule-memmingen.de',      web: 'elsbethenschule-memmingen.de' }),
  s({ id: 'mm-edith',     name: 'Edith-Stein-Schule, Grundschule Memmingen',       ort: 'Memmingen',               typ: 'G', lat: 47.9842, lng: 10.1788, adresse: 'Kneippstraße 22, 87700 Memmingen',          tel: '08331 785062-0', fax: '08331 785026-99', mail: 'verwaltung@esgs-mm.de',                         web: 'edith-stein-schule-mm.de' }),
  s({ id: 'mm-linden',    name: 'Lindenschule, Mittelschule Memmingen',            ort: 'Memmingen',               typ: 'M', lat: 47.9905, lng: 10.1798, adresse: 'Maserstraße 2, 87700 Memmingen',             tel: '08331 3038',     fax: '08331 81960',     mail: 'linde@lindenschule-mm.de',                      web: 'lindenschule-mm.de' }),
  s({ id: 'mm-theodor',   name: 'Theodor-Heuss-Schule, Grundschule Memmingen',     ort: 'Memmingen',               typ: 'G', lat: 47.9810, lng: 10.1885, adresse: 'Machnigstraße 8, 87700 Memmingen',           tel: '08331 7850580',  fax: '08331 78505899',  mail: 'info@theodor-heuss-schule-mm.de',               web: 'theodor-heuss-schule-mm.de' }),
  s({ id: 'mm-amen-gs',   name: 'Grundschule Memmingen-Amendingen',                ort: 'Memmingen-Amendingen',    typ: 'G', lat: 48.0082, lng: 10.1840, adresse: 'Waimerstr. 10, 87700 Memmingen',              tel: '08331 7850-610', fax: '08331 7850-6199', mail: 'verwaltung@gsms-amendingen.de',                 web: 'schule-amendingen.de' }),
  s({ id: 'mm-amen-ms',   name: 'Mittelschule Memmingen-Amendingen',               ort: 'Memmingen-Amendingen',    typ: 'M', lat: 48.0076, lng: 10.1848, adresse: 'Waimerstr. 10, 87700 Memmingen',              tel: '08331 7850-610', fax: '08331 7850-6199', mail: 'verwaltung@gsms-amendingen.de',                 web: 'schule-amendingen.de' }),
  s({ id: 'mm-dicken',    name: 'Grundschule Memmingen-Dickenreishausen',          ort: 'Memmingen-Dickenreishausen', typ: 'G', lat: 47.9520, lng: 10.2240, adresse: 'Oberdorfstr. 34, 87700 Memmingen',        tel: '08331 86443',    fax: '08331 990880',    mail: 'schulleitung@schule-dickenreishausen.de' }),
  s({ id: 'mm-steinheim', name: 'Grundschule Memmingen-Steinheim',                 ort: 'Memmingen-Steinheim',     typ: 'G', lat: 47.9690, lng: 10.1460, adresse: 'Schulweg 2, 87700 Memmingen',                tel: '08331 7850 570', fax: '08331 925244',    mail: 'sekretariat@gsst-mm.de',                        web: 'gs-steinheim.de' }),
  s({ id: 'mm-aloysius',  name: 'Grundschule St. Aloysius, Privatschule Memmingen', ort: 'Memmingen',              typ: 'G', lat: 47.9888, lng: 10.1810, adresse: 'Pfarrhofstr. 6, 87700 Memmingen',            tel: '08331 9667755',  fax: '',                mail: 'info@aloysius-grundschule.de',                  web: 'aloysius-grundschule.de' }),
];

export const MAP_DEFAULT_VIEW = { center: [48.00, 10.36] as [number, number], zoom: 10 };

function makeNeed(
  partial: Omit<TrainingNeed, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>,
): TrainingNeed {
  const now = new Date().toISOString();
  return { id: '', schoolId: '', createdAt: now, updatedAt: now, ...partial };
}

export const FORTBILDUNGEN_DEFAULT: SchoolFortbildungen = {
  laufend: [
    { titel: 'Digitale Tafeln im Unterricht', teilnehmer: 12, ende: '2026-07-15' },
    { titel: 'Lese-Förderung Jgst. 1–4',      teilnehmer: 8,  ende: '2026-06-30' },
  ],
  bedarf: [
    makeNeed({
      topic:           'KI im Schulalltag',
      description:     'Einstieg in KI-Tools für den täglichen Unterricht (ChatGPT, Bilderzeugung, Textanalyse).',
      priority:        'hoch',
      targetGroup:     'Alle Lehrkräfte',
      preferredFormat: 'praesenz',
    }),
    makeNeed({
      topic:           'DaZ – Deutsch als Zweitsprache',
      description:     'Methoden und Materialien für Lehrkräfte mit Schülerinnen und Schülern nichtdeutscher Muttersprache.',
      priority:        'mittel',
      targetGroup:     'Klassenlehrkräfte',
      preferredFormat: 'schilf',
    }),
  ],
};
