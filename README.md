# Laura

Laura je lokálny, offline-first diár a CRM pre psí salón. Aplikácia je určená na každodennú správu termínov, klientov a psíkov priamo v prehliadači na jednom zariadení, bez závislosti od cloudovej synchronizácie.

## Funkcie

- Prehľad dňa a mesiaca
- Kalendár termínov (mesiac, týždeň, deň)
- Správa majiteľov a psíkov
- Štítky pre majiteľov, psíkov a termíny vrátane podpory neaktívnych štítkov
- Detail termínu s kontextom psíka a majiteľa
- Fotky pred/po pri termínoch
- História psíka
- Tržby a tringelty
- Zálohy (export a obnova)
- Heslo / zámok aplikácie
- Offline režim (PWA)

## Dáta a zálohy

Aplikácia ukladá dáta lokálne v prehliadači/zariadení (IndexedDB). Dáta sa automaticky nesynchronizujú do cloudu, preto je pravidelný export zálohy dôležitý.

Pri exporte je možné vytvoriť šifrovanú zálohu. Obnova zo zálohy nahradí aktuálne lokálne dáta dátami zo zvoleného záložného súboru.

Ak prehliadač povolí trvalé úložisko, znižuje sa pravdepodobnosť automatického vymazania lokálnych dát pri čistení miesta. Nie je to náhrada za pravidelné zálohy.

## Heslo a bezpečnosť

Heslo v aplikácii slúži ako lokálny zámok prístupu do používateľského rozhrania. Pomáha obmedziť bežný prístup cez UI, ale nešifruje samotné dáta uložené v IndexedDB.

Šifrovanie exportovanej zálohy je samostatná funkcia. Chráni záložný súbor pri exporte, ak používateľ zvolí šifrovaný export.

## Spustenie lokálne

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Kontrola kvality

```bash
npm run lint
```

## Technológie

- React
- TypeScript
- Vite
- Dexie / IndexedDB
- Tailwind CSS
- React Router
- React Day Picker
- vite-plugin-pwa
- fflate (spracovanie ZIP záloh)
