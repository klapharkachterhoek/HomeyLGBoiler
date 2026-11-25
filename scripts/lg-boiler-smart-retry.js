/**
 * LG Boiler Smart Retry - STABIELE VERSIE
 * Versie: 1.0.0
 */

// --- CONFIGURATIE ---
const NAAM_BOILER    = "Boiler"; 
const NAAM_BEHEERDER  = "Jouw Naam";   // naam van je Homey-gebruiker
const maxAttempts     = 3; 
const delayMs         = 35000; 

// 1. Instellingen uit de Flow-kaart halen
let targetTemp = 55; 
let targetMode = "HEAT_PUMP"; 

if (typeof args !== 'undefined' && args && args[0]) {
    const params = args[0].split(',');
    if (params[0]) targetTemp = Number(params[0].trim());
    if (params[1]) targetMode = params[1].trim();
}

console.log(`--- START BOILER UPDATE: ${new Date().toLocaleTimeString()} ---`);

// 2. Apparaten en Gebruiker ophalen
const allDevices = await Homey.devices.getDevices();
const allUsers    = await Homey.users.getUsers();

const device = Object.values(allDevices).find(d => d.name === NAAM_BOILER);
const beheerder = Object.values(allUsers).find(u => u.name === NAAM_BEHEERDER);

if (!device) throw new Error(`Apparaat '${NAAM_BOILER}' niet gevonden.`);

const tempCap = 'target_temperature';
const modeCap = 'thermostat_cmode_HP'; 

// --- HELPER FUNCTIES ---
const stuurTijdlijn = async (tekst) => {
    await Homey.flow.runFlowCardAction({
        uri: 'homey:manager:notifications',
        id: 'homey:manager:notifications:create_notification',
        args: { text: tekst }
    });
};

const stuurPush = async (tekst, isCritical = false) => {
    if (!beheerder) return;
    const cardId = isCritical ? 'homey:manager:mobile:push_text_critical' : 'homey:manager:mobile:push_text';
    await Homey.flow.runFlowCardAction({
        uri: 'homey:manager:mobile',
        id: cardId,
        args: { user: beheerder, text: tekst }
    });
};

async function runAttempt(attempt) {
    console.log(`\n[POGING ${attempt}]`);

    try {
        await device.setCapabilityValue(modeCap, targetMode);
        await device.setCapabilityValue(tempCap, targetTemp);
    } catch (err) {
        console.log(`! Fout bij instellen: ${err.message}`);
    }

    console.log(`> Wachten op cloud sync (${delayMs / 1000}s)...`);
    await wait(delayMs); 

    const updatedDevices = await Homey.devices.getDevices();
    const updatedDevice = Object.values(updatedDevices).find(d => d.name === NAAM_BOILER);
    
    const currentTemp = updatedDevice.capabilitiesObj[tempCap]?.value;
    const currentMode = updatedDevice.capabilitiesObj[modeCap]?.value;
    
    console.log(`> Status in Homey: ${currentMode} / ${currentTemp}°C`);

    return (Number(currentTemp) === targetTemp && currentMode === targetMode);
}

async function main() {
    let success = false;
    for (let i = 1; i <= maxAttempts; i++) {
        success = await runAttempt(i);
        if (success) {
            const msg = `✅ Boiler succesvol ingesteld op ${targetTemp}°C (${targetMode}).`;
            console.log(msg);
            await stuurTijdlijn(msg);
            break;
        }
    }

    if (!success) {
        const foutMsg = `🚨 LG Boiler Error: Instellen naar ${targetTemp}°C mislukt na ${maxAttempts} pogingen.`;
        console.log(foutMsg);
        
        // Stuur een kritieke push bij falen
        await stuurPush(foutMsg, true);
        return `FOUT: Boiler staat nog op ${device.capabilitiesObj[tempCap]?.value}°C`;
    }
    
    return `✅ Boiler succesvol naar ${targetTemp}°C`;
}

// Uitvoeren
const finaleStatus = await main();
return finaleStatus;
