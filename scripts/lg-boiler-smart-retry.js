/**
 * HomeyLGBoiler - LG Boiler Smart Retry
 * https://github.com/klapharkachterhoek/HomeyLGBoiler
 *
 * Zet modus en doeltemperatuur van een LG-warmtepompboiler (via de cloud)
 * en controleert of de waarde echt is overgenomen.
 *
 * Gebruik in een flow: "Voer een script uit met een argument"
 *   argument: "<temperatuur>, <modus>"   bv. "55, HEAT_PUMP" of "35, VACATION"
 */

const VERSION = '2.0.0';

// --- CONFIGURATIE ---
const NAAM_BOILER    = "Boiler";
const NAAM_BEHEERDER = "Jouw Naam";     // naam van je Homey-gebruiker (voor pushberichten)
const MAX_POGINGEN   = 3;
const WACHT_MS       = 35000;           // tijd voor de cloud-sync, niet inkorten
const MIN_TEMP       = 30;              // pas aan aan wat jouw LG toestaat
const MAX_TEMP       = 65;
const TEMP_CAP       = 'target_temperature';
const MODE_CAP       = 'thermostat_cmode_HP';
const LOCK_KEY       = 'lgBoilerUpdateBezig';
const LOCK_MAX_MS    = 5 * 60 * 1000;   // lock vervalt na 5 min (bv. na een crash)

// --- 1. Argumenten ---
let targetTemp = 55;
let targetMode = "HEAT_PUMP";

if (typeof args !== 'undefined' && args && args[0]) {
    const [t, m] = String(args[0]).split(',').map(s => s.trim());
    if (t) targetTemp = Number(t);
    if (m) targetMode = m;
}

if (!Number.isFinite(targetTemp) || targetTemp < MIN_TEMP || targetTemp > MAX_TEMP) {
    throw new Error(`Ongeldige temperatuur '${args?.[0]}' (verwacht ${MIN_TEMP}-${MAX_TEMP}).`);
}
if (!targetMode) throw new Error('Geen modus opgegeven.');

// --- 2. Lock tegen dubbele runs ---
const lock = global.get(LOCK_KEY);
if (lock && Date.now() - lock < LOCK_MAX_MS) {
    console.log('Er loopt al een boiler-update, deze run wordt overgeslagen.');
    return 'OVERGESLAGEN: update al bezig';
}
global.set(LOCK_KEY, Date.now());

console.log(`--- HomeyLGBoiler v${VERSION} | START: ${new Date().toLocaleTimeString()} → ${targetTemp}°C / ${targetMode} ---`);

// --- HELPERS ---
const stuurTijdlijn = async (tekst) => {
    try {
        await Homey.flow.runFlowCardAction({
            uri: 'homey:manager:notifications',
            id: 'homey:manager:notifications:create_notification',
            args: { text: tekst },
        });
    } catch (err) {
        console.log(`! Tijdlijn-melding mislukt: ${err.message}`);
    }
};

const stuurPush = async (beheerder, tekst, isCritical = false) => {
    if (!beheerder) {
        console.log(`! Gebruiker '${NAAM_BEHEERDER}' niet gevonden, val terug op tijdlijn.`);
        return stuurTijdlijn(tekst);
    }
    try {
        await Homey.flow.runFlowCardAction({
            uri: 'homey:manager:mobile',
            id: isCritical ? 'homey:manager:mobile:push_text_critical' : 'homey:manager:mobile:push_text',
            args: { user: beheerder, text: tekst },
        });
    } catch (err) {
        console.log(`! Push mislukt (${err.message}), val terug op tijdlijn.`);
        await stuurTijdlijn(tekst);
    }
};

async function main() {
    // Apparaat en gebruiker één keer opzoeken
    const allDevices = await Homey.devices.getDevices();
    const device = Object.values(allDevices).find(d => d.name === NAAM_BOILER);
    if (!device) throw new Error(`Apparaat '${NAAM_BOILER}' niet gevonden.`);

    const allUsers = await Homey.users.getUsers();
    const beheerder = Object.values(allUsers).find(u => u.name === NAAM_BEHEERDER);

    const zet = async (capabilityId, value) => {
        try {
            await Homey.devices.setCapabilityValue({ deviceId: device.id, capabilityId, value });
        } catch (err) {
            console.log(`! Fout bij ${capabilityId} → ${value}: ${err.message}`);
        }
    };

    const leesStatus = async () => {
        const d = await Homey.devices.getDevice({ id: device.id });
        return {
            temp: Number(d.capabilitiesObj?.[TEMP_CAP]?.value),
            mode: d.capabilitiesObj?.[MODE_CAP]?.value,
        };
    };

    let status = null;

    for (let i = 1; i <= MAX_POGINGEN; i++) {
        console.log(`\n[POGING ${i}]`);

        await zet(MODE_CAP, targetMode);   // los van elkaar: faalt de ene, dan
        await zet(TEMP_CAP, targetTemp);   // wordt de andere toch geprobeerd

        console.log(`> Wachten op cloud sync (${WACHT_MS / 1000}s)...`);
        await wait(WACHT_MS);

        status = await leesStatus();
        console.log(`> Status in Homey: ${status.mode} / ${status.temp}°C`);

        if (status.temp === targetTemp && status.mode === targetMode) {
            const msg = `✅ Boiler ingesteld op ${targetTemp}°C (${targetMode}) na ${i} poging(en). [v${VERSION}]`;
            console.log(msg);
            await stuurTijdlijn(msg);
            return msg;
        }
    }

    const foutMsg = `🚨 LG Boiler: instellen naar ${targetTemp}°C (${targetMode}) mislukt na ${MAX_POGINGEN} pogingen. ` +
                    `Huidige status: ${status?.mode} / ${status?.temp}°C. [v${VERSION}]`;
    console.log(foutMsg);
    await stuurPush(beheerder, foutMsg, true);
    return `FOUT: ${foutMsg}`;
}

try {
    return await main();
} finally {
    global.set(LOCK_KEY, null);
}
