# Changelog

Alle noemenswaardige wijzigingen in dit project staan in dit bestand.
Versienummering volgt [Semantic Versioning](https://semver.org/lang/nl/): `MAJOR.MINOR.PATCH`.

## [2.0.0] - 2026-11-25
### Toegevoegd
- Advanced Flow *Boiler slim (zon + stroomprijs)* (`flows/boiler-slim-zon-stroomprijs.json`):
  - 20:45: zonverwachting voor morgen (> 20 kWh) bepaalt of het een zonnedag wordt (`BoilerZonMorgen`).
  - Nacht (21:00–09:00): opwarmen in de 7 goedkoopste uren als er morgen weinig zon komt.
  - Dag (10:00–17:00): op zonnedagen opwarmen in de 5 zonnigste uren.
  - 17:05: vangnet als de boiler op een zonnedag onder 45 °C blijft.
  - Tijdlijnlogging van elke planning en schakeling; push bij fouten.
- `VERSION`-bestand en `VERSION`-constante in het script; versie staat in log- en tijdlijnmeldingen.
- README met werking, installatie en tunen.

### Gewijzigd
- Script: argumenten worden gevalideerd (getal + bereik `MIN_TEMP`–`MAX_TEMP`).
- Script: modus en temperatuur worden los van elkaar ingesteld, zodat een fout bij de ene de andere niet blokkeert.
- Script: boiler één keer op naam opzoeken, daarna op ID uitlezen (`getDevice`) in plaats van elke poging alle apparaten op te halen.
- Script: lock via `global` voorkomt dat twee runs tegelijk commando's sturen.

### Opgelost
- Foutmelding toonde de temperatuur van vóór de eerste poging; nu de laatst teruggelezen status.
- Falende tijdlijn- of pushmelding liet het script crashen; nu afgevangen, met terugval van push naar tijdlijn.

### Verwijderd
- Vaste tijden 11:30 / 15:00 / 16:00 (vervangen door de slimme flow).

## [1.0.0] - 2026-11-22
### Toegevoegd
- HomeyScript `lg-boiler-smart-retry.js`: zet modus en temperatuur van de LG-warmtepompboiler via de cloud en controleert na 35 s of de waarde is overgenomen (max. 3 pogingen, kritieke push bij falen).

[2.0.0]: https://github.com/klapharkachterhoek/HomeyLGBoiler/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/klapharkachterhoek/HomeyLGBoiler/releases/tag/v1.0.0
