# Changelog

Alle noemenswaardige wijzigingen in dit project staan in dit bestand.
Versienummering volgt [Semantic Versioning](https://semver.org/lang/nl/): `MAJOR.MINOR.PATCH`.

## [1.0.0] - 2026-11-22
### Toegevoegd
- HomeyScript `lg-boiler-smart-retry.js`: zet modus en temperatuur van de LG-warmtepompboiler via de cloud en controleert na 35 s of de waarde is overgenomen (max. 3 pogingen, kritieke push bij falen).
