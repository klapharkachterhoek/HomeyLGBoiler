# HomeyLGBoiler

Slimme aansturing van een **LG-warmtepompboiler** met **Homey Pro**: de boiler warmt op met eigen zonnestroom als er genoeg zon verwacht wordt, en anders in de goedkoopste nachturen van een dynamisch stroomcontract (bijv. Tibber).

Huidige versie: zie [`VERSION`](VERSION) · wijzigingen: [`CHANGELOG.md`](CHANGELOG.md)

## Onderdelen

| Bestand | Wat |
|---|---|
| [`scripts/lg-boiler-smart-retry.js`](scripts/lg-boiler-smart-retry.js) | HomeyScript dat modus + temperatuur via de LG-cloud zet en controleert of het is overgenomen (3 pogingen, kritieke push bij falen). |
| [`flows/boiler-slim-zon-stroomprijs.json`](flows/boiler-slim-zon-stroomprijs.json) | Export van de Advanced Flow die bepaalt *wanneer* de boiler opwarmt. |

## Hoe het werkt

```
20:45  Zonverwachting morgen > 20 kWh?  ──ja──► BoilerZonMorgen = ja  (☀️ melding)
                                         └─nee─► BoilerZonMorgen = nee (🌙 melding)

21:00–09:00 (elk uur)   BoilerZonMorgen = nee  →  een van de 7 goedkoopste uren?  → 55°C HEAT_PUMP
                                                                           anders → 35°C VACATION
10:00–17:00 (elk uur)   BoilerZonMorgen = ja   →  een van de 5 zonnigste uren?   → 55°C HEAT_PUMP
                                                                           anders → 35°C VACATION
17:05  Zonnedag maar boiler < 45°C?  → vangnet: 55°C AUTO + push
```

- De variabele `BoilerNachtVerwarmen` onthoudt of de flow de boiler zelf heeft aangezet. Het script draait dus alleen bij een echte wijziging, en handmatige standen (turbo) worden niet teruggezet.
- Elke beslissing en schakeling komt op de **Homey-tijdlijn** (🌙/☀️ planning, 🔥 aan, 💤 uit, ☁️ vangnet, ⚠️ fouten).
- Kunnen de stroomprijzen niet worden opgehaald, dan warmt de boiler toch op en krijg je een push. Is de zonverwachting niet beschikbaar, dan valt de flow terug op de nachtmodus.

## Installatie

1. **Homey Energie**: stel je dynamische stroomprijzen (bijv. Tibber) en je zonnepanelen in. De flow gebruikt Homey's kaarten *"een van de … goedkoopste uren tussen … en …"*, *"… uren met de hoogste verwachte zonne-energieopbrengst"* en *"verwachte zonne-energieopbrengst morgen hoger dan … kWh"*.
2. **HomeyScript**: maak een script (bijv. *Temperatuur variabel instellen*), plak de inhoud van `scripts/lg-boiler-smart-retry.js` erin en vul `NAAM_BEHEERDER` (en zo nodig `NAAM_BOILER`) in.
3. **Logic-variabelen** (Ja/Nee, startwaarde *nee*): `BoilerNachtVerwarmen` en `BoilerZonMorgen`.
4. **Advanced Flow**: bouw de flow na volgens `flows/boiler-slim-zon-stroomprijs.json`. Vervang daarin de `{{PLACEHOLDERS}}` door de ID's van je eigen boiler, prijsapparaat, variabelen, script en gebruiker. (Het bestand is een export van de flowstructuur via de Homey API. Het is geen bestand dat je in de Homey-app kunt importeren.)

## Instellen / tunen

| Waarde | Standaard | Waar | Wanneer aanpassen |
|---|---|---|---|
| Zon-drempel morgen | 20 kWh | flow, kaart om 20:45 | Batterijen 's avonds leeg op zonnedagen → hoger. Stookt in de zomer 's nachts → lager. |
| Goedkoopste nachturen | 7 | flow | Boiler haalt 55 °C niet → hoger. |
| Zonnigste uren overdag | 5 | flow | Idem. |
| Doeltemperatuur | 55 °C | flow (scriptargument) | Te koud bij het douchen → 58 °C. |
| `MIN_TEMP` / `MAX_TEMP` | 30 / 65 | script | Bereik van jouw LG-model. |

## Versienummering

Dit project gebruikt [Semantic Versioning](https://semver.org/lang/nl/) (`MAJOR.MINOR.PATCH`):

- **MAJOR**: werking of flowopbouw verandert zo dat je de flow of variabelen opnieuw moet instellen.
- **MINOR**: nieuwe functionaliteit die bestaande instellingen niet breekt.
- **PATCH**: bugfixes en kleine aanpassingen.

Bij een release: werk `VERSION`, de `VERSION`-constante in het script, `homeyLGBoilerVersion` in de flow-export en `CHANGELOG.md` bij, en tag de commit als `vX.Y.Z`. Het script zet zijn versie in de HomeyScript-log en in de tijdlijnmeldingen, zodat je in Homey ziet welke versie draait.
