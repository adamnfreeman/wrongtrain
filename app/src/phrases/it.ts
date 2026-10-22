/* Italian phrase pack. No recorded clips: every phrase uses the phone's own Italian voice.
   The "ja" field holds the Italian (the name is historical); "ro" is empty because Italian needs no romanisation. */
import type { PhrasePack } from './types';

const it: PhrasePack = {
  lang: 'it',
  speechLang: 'it-IT',
  name: 'Italian',
  intro: 'Say every letter: a “ah”, e “eh”, i “ee”, o “oh”, u “oo”, and a final e is never silent. C and g are soft before e and i (“ch”, “j”) and hard before h, and double consonants are held a beat longer.',
  dictionary: { label: 'WordReference', url: 'https://www.wordreference.com/iten/' },
  groups: [
 {
  "cat": "Basics",
  "items": [
   {
    "en": "Hello",
    "ja": "Salve",
    "ro": "",
    "say": "SAHL-veh",
    "when": "A polite hello for any time of day, safe with strangers. “Ciao” is for friends; with shop staff, “buongiorno” or “buonasera” is better still."
   },
   {
    "en": "Good morning",
    "ja": "Buongiorno",
    "ro": "",
    "say": "bwon-JOR-noh",
    "when": "Used until early afternoon, not just the morning. Say it as you walk into a shop, a bar or a lift."
   },
   {
    "en": "Good evening",
    "ja": "Buonasera",
    "ro": "",
    "say": "bwoh-nah-SEH-rah",
    "when": "From mid-afternoon, around 4 or 5 PM, which is earlier than in English."
   },
   {
    "en": "Thank you",
    "ja": "Grazie",
    "ro": "",
    "say": "GRAH-tsee-eh",
    "when": "Say all three syllables, not “grah-zee”. “Grazie mille” is a warmer thank you."
   },
   {
    "en": "Excuse me / Sorry",
    "ja": "Mi scusi",
    "ro": "",
    "say": "mee SKOO-zee",
    "when": "The polite form for strangers: get someone's attention, call a waiter or apologise for something small. To squeeze past people, say “permesso” (pehr-MESS-soh)."
   },
   {
    "en": "I'm sorry",
    "ja": "Mi dispiace",
    "ro": "",
    "say": "mee dee-SPYAH-cheh",
    "when": "Real regret, or sympathy for bad news. For bumping into someone, Italians just say “scusi”."
   },
   {
    "en": "Yes / No",
    "ja": "Sì / No",
    "ro": "",
    "say": "see / noh",
    "when": "A plain “no” is fine in Italian. Add “grazie” to soften it."
   },
   {
    "en": "No thanks, I'm fine",
    "ja": "No, grazie, va bene così",
    "ro": "",
    "say": "noh, GRAH-tsee-eh, vah BEH-neh koh-ZEE",
    "when": "Turns down a bag, more bread or a street seller. “Va bene così” as you hand over money also means “keep the change”. When someone apologises to you, say “non fa niente” (it's nothing)."
   },
   {
    "en": "Please",
    "ja": "Per favore",
    "ro": "",
    "say": "pehr fah-VOH-reh",
    "when": "Add it after whatever you are asking for: “un caffè, per favore”. Pointing at something and saying this is a complete request."
   },
   {
    "en": "I don't understand",
    "ja": "Non capisco",
    "ro": "",
    "say": "nohn kah-PEE-skoh",
    "when": "When someone speaks to you in Italian and you are lost. Say it with “mi scusi”."
   },
   {
    "en": "Do you speak English?",
    "ja": "Parla inglese?",
    "ro": "",
    "say": "PAHR-lah een-GLEH-zeh",
    "when": "Ask before launching into English. Hotel staff and younger people in cities often do; in small towns, less so."
   },
   {
    "en": "Once more, slowly, please",
    "ja": "Può ripetere più lentamente, per favore?",
    "ro": "",
    "say": "pwoh ree-PEH-teh-reh pyoo len-tah-MEN-teh, pehr fah-VOH-reh",
    "when": "When you nearly caught it. Italians speak fast and with their hands; the hands help."
   },
   {
    "en": "Where is the toilet?",
    "ja": "Dov'è il bagno?",
    "ro": "",
    "say": "doh-VEH eel BAHN-yoh",
    "when": "Public toilets are scarce. Bars let customers use theirs, so buy a coffee first. Station toilets usually charge about €1."
   },
   {
    "en": "Cheers!",
    "ja": "Salute! / Cin cin!",
    "ro": "",
    "say": "sah-LOO-teh / cheen CHEEN",
    "when": "Either works. Look people in the eye as the glasses touch; not doing so is said to be bad luck."
   }
  ]
 },
 {
  "cat": "Eating out",
  "items": [
   {
    "en": "Four people",
    "ja": "Siamo in quattro",
    "ro": "",
    "say": "SYAH-moh een KWAHT-troh",
    "when": "The answer to “quanti siete?” (how many are you?). Holding up fingers works; Italians count from the thumb. Book ahead for dinner at popular places."
   },
   {
    "en": "Do you have an English menu?",
    "ja": "Avete un menù in inglese?",
    "ro": "",
    "say": "ah-VEH-teh oon meh-NOO een een-GLEH-zeh",
    "when": "Common in cities. The day's specials are often only on a board or said aloud, so ask about those too."
   },
   {
    "en": "This one, please",
    "ja": "Questo, per favore",
    "ro": "",
    "say": "KWEH-stoh, pehr fah-VOH-reh",
    "when": "Point at the menu, the pastry case or the deli counter. At busy counters, take a number from the ticket machine first."
   },
   {
    "en": "Two of these, please",
    "ja": "Due di questi, per favore",
    "ro": "",
    "say": "DOO-eh dee KWEH-stee, pehr fah-VOH-reh",
    "when": "Counting: uno (1), due (2), tre (3), quattro (4)."
   },
   {
    "en": "I'm vegetarian",
    "ja": "Sono vegetariano / vegetariana",
    "ro": "",
    "say": "SOH-noh veh-jeh-tah-RYAH-noh / veh-jeh-tah-RYAH-nah",
    "when": "Men say “vegetariano”, women “vegetariana”. Widely understood, but meat stock and anchovies may not count, so follow it with the next phrase."
   },
   {
    "en": "I don't eat meat or fish",
    "ja": "Non mangio né carne né pesce",
    "ro": "",
    "say": "nohn MAHN-joh neh KAHR-neh neh PEH-sheh",
    "when": "Clearer than “vegetarian”. Watch for pancetta or guanciale (cured pork) in pasta sauces like carbonara and amatriciana."
   },
   {
    "en": "Does this have meat or fish in it?",
    "ja": "C'è carne o pesce in questo piatto?",
    "ro": "",
    "say": "cheh KAHR-neh oh PEH-sheh een KWEH-stoh PYAHT-toh",
    "when": "Point at a dish and ask. “Sì, c'è” means it does; “no, non c'è” means it doesn't."
   },
   {
    "en": "Is it made with meat or fish stock?",
    "ja": "È fatto con brodo di carne o di pesce?",
    "ro": "",
    "say": "eh FAHT-toh kohn BROH-doh dee KAHR-neh oh dee PEH-sheh",
    "when": "Risotto and soups are often made with chicken or beef stock even when they look all vegetable. Vegetable stock is “brodo vegetale”."
   },
   {
    "en": "Without meat, please",
    "ja": "Senza carne, per favore",
    "ro": "",
    "say": "SEN-tsah KAHR-neh, pehr fah-VOH-reh",
    "when": "Asks them to leave it out. Swap “carne” for “pesce” (fish). Pasta is often easy to change; set dishes less so."
   },
   {
    "en": "Water, please",
    "ja": "Dell'acqua, per favore",
    "ro": "",
    "say": "del-LAHK-kwah, pehr fah-VOH-reh",
    "when": "You'll be asked “naturale o frizzante?” (still or sparkling). Bottled water is the norm in restaurants and is charged. Tap water is safe to drink."
   },
   {
    "en": "It's delicious",
    "ja": "È buonissimo!",
    "ro": "",
    "say": "eh bwoh-NEES-see-moh",
    "when": "Say it to the server or the cook. It goes down very well in family-run places."
   },
   {
    "en": "Thank you, it was all excellent",
    "ja": "Grazie, era tutto ottimo",
    "ro": "",
    "say": "GRAH-tsee-eh, EH-rah TOOT-toh OT-tee-moh",
    "when": "Say it to the staff as you pay or leave, then “arrivederci” (ah-ree-veh-DEHR-chee), goodbye."
   },
   {
    "en": "The bill, please",
    "ja": "Il conto, per favore",
    "ro": "",
    "say": "eel KOHN-toh, pehr fah-VOH-reh",
    "when": "The bill never comes until you ask. A “coperto” (cover charge, a few euros each) is normal and on the menu. Tipping isn't expected; rounding up is kind."
   },
   {
    "en": "Can I pay by card?",
    "ja": "Posso pagare con la carta?",
    "ro": "",
    "say": "POHS-soh pah-GAH-reh kohn lah KAHR-tah",
    "when": "Shops and restaurants are required to take cards, but small bars and market stalls may prefer cash for small amounts. Keep some coins."
   },
   {
    "en": "To take away, please",
    "ja": "Da portare via, per favore",
    "ro": "",
    "say": "dah por-TAH-reh VEE-ah, pehr fah-VOH-reh",
    "when": "In a bar, coffee standing at the counter (“al banco”) costs less than at a table (“al tavolo”). In busy bars you often pay at the till first, then order with the receipt."
   }
  ]
 },
 {
  "cat": "Getting around",
  "items": [
   {
    "en": "Where is Roma Termini station?",
    "ja": "Dov'è la stazione Termini?",
    "ro": "",
    "say": "doh-VEH lah stah-TSYOH-neh TEHR-mee-nee",
    "when": "Swap in any place after “dov'è”. “Stazione” means station."
   },
   {
    "en": "Does this train go to Florence?",
    "ja": "Questo treno va a Firenze?",
    "ro": "",
    "say": "KWEH-stoh TREH-noh vah ah fee-REN-tseh",
    "when": "Ask before you board; swap in your stop. Paper regional tickets must be stamped in the machine on the platform first or you can be fined; tickets for a set train and time (Frecciarossa, Italo) don't need it."
   },
   {
    "en": "Which platform?",
    "ja": "Da che binario parte?",
    "ro": "",
    "say": "dah keh bee-NAH-ryoh PAHR-teh",
    "when": "Show your ticket as you ask. The platform (“binario”) often appears on the board only shortly before the train leaves."
   },
   {
    "en": "To here, please",
    "ja": "Mi porti qui, per favore",
    "ro": "",
    "say": "mee POR-tee kwee, pehr fah-VOH-reh",
    "when": "For taxis. Show the address or map pin on your phone. Taxis rarely stop when hailed; go to a taxi rank or book by phone or app."
   },
   {
    "en": "I'm getting off",
    "ja": "Scendo, permesso",
    "ro": "",
    "say": "SHEN-doh, pehr-MESS-soh",
    "when": "“Permesso” asks people to let you through. On a crowded bus, people may ask you “scende?” (are you getting off?) so they can swap places."
   },
   {
    "en": "Is this seat free?",
    "ja": "È libero questo posto?",
    "ro": "",
    "say": "eh LEE-beh-roh KWEH-stoh POH-stoh",
    "when": "On long-distance trains every seat is reserved, so check your ticket's car (“carrozza”) and seat number."
   },
   {
    "en": "I'm lost",
    "ja": "Mi sono perso / persa",
    "ro": "",
    "say": "mee SOH-noh PEHR-soh / PEHR-sah",
    "when": "Men say “perso”, women “persa”. Then show where you are trying to go; ask in a bar or shop and someone will point the way."
   }
  ]
 },
 {
  "cat": "Shopping",
  "items": [
   {
    "en": "How much is this?",
    "ja": "Quanto costa?",
    "ro": "",
    "say": "KWAHN-toh KOH-stah",
    "when": "Shop prices are fixed. At market stalls you can ask “mi fa uno sconto?” (a small discount?) when buying several things."
   },
   {
    "en": "Do you have this?",
    "ja": "Avete questo?",
    "ro": "",
    "say": "ah-VEH-teh KWEH-stoh",
    "when": "Show a photo on your phone. At markets and greengrocers, don't pick up the produce yourself; ask the seller."
   },
   {
    "en": "Can I have the tax refund form, please?",
    "ja": "Mi fa il tax free, per favore?",
    "ro": "",
    "say": "mee fah eel tax FREE, pehr fah-VOH-reh",
    "when": "Visitors from outside the EU can claim back VAT on more than €70 spent in one shop on one day. Bring your passport, and have the form checked by customs at your last EU airport before checking your bags."
   },
   {
    "en": "Can I try this on?",
    "ja": "Posso provarlo?",
    "ro": "",
    "say": "POHS-soh proh-VAHR-loh",
    "when": "The fitting room is “il camerino” (eel kah-meh-REE-noh)."
   },
   {
    "en": "Do you have a bigger size?",
    "ja": "Ce l'ha in una taglia più grande?",
    "ro": "",
    "say": "cheh LAH een OO-nah TAHL-yah pyoo GRAHN-deh",
    "when": "Italian sizes differ from UK and US ones and often run small. For smaller, say “più piccola” (pyoo PEEK-koh-lah)."
   },
   {
    "en": "I don't need a bag",
    "ja": "Non mi serve la busta, grazie",
    "ro": "",
    "say": "nohn mee SEHR-veh lah BOO-stah, GRAH-tsee-eh",
    "when": "Supermarket bags cost a few cents, so cashiers ask whether you want one (“la busta?”)."
   },
   {
    "en": "I'm just looking",
    "ja": "Sto solo guardando, grazie",
    "ro": "",
    "say": "stoh SOH-loh gwahr-DAHN-doh, GRAH-tsee-eh",
    "when": "If staff come over to help and you want to browse. Say “buongiorno” as you go in and “grazie, arrivederci” as you leave, even if you buy nothing."
   }
  ]
 },
 {
  "cat": "Hotels",
  "items": [
   {
    "en": "Checking in, please",
    "ja": "Vorrei fare il check-in, per favore",
    "ro": "",
    "say": "vor-RAY FAH-reh eel check-in, pehr fah-VOH-reh",
    "when": "Have passports ready; hotels must register every guest. A city tax (“tassa di soggiorno”) per person per night is often paid at the desk, sometimes in cash."
   },
   {
    "en": "Can you hold our bags?",
    "ja": "Possiamo lasciare i bagagli qui?",
    "ro": "",
    "say": "pohs-SYAH-moh lah-SHAH-reh ee bah-GAHL-yee kwee",
    "when": "Before check-in time or after checkout. Most hotels will; at a small B&B with no front desk, arrange it ahead."
   },
   {
    "en": "What's the Wi-Fi password?",
    "ja": "Qual è la password del Wi-Fi?",
    "ro": "",
    "say": "kwahl EH lah PASS-word del WAI-fai",
    "when": "Usually on a card in the room. Many Italians say Wi-Fi as “wee-fee”."
   }
  ]
 },
 {
  "cat": "Photos & baths",
  "items": [
   {
    "en": "May I take a photo?",
    "ja": "Posso fare una foto?",
    "ro": "",
    "say": "POHS-soh FAH-reh OO-nah FOH-toh",
    "when": "Ask in shops and before photographing people. Some churches and museums ban photos or flash; the Sistine Chapel bans photos entirely."
   },
   {
    "en": "Could you take our photo?",
    "ja": "Ci può fare una foto?",
    "ro": "",
    "say": "chee pwoh FAH-reh OO-nah FOH-toh",
    "when": "Hand over the phone with the camera already open."
   },
   {
    "en": "Are tattoos OK?",
    "ja": "Si può entrare con i tatuaggi?",
    "ro": "",
    "say": "see pwoh en-TRAH-reh kohn ee tah-too-AHJ-jee",
    "when": "Tattoos are rarely a problem at Italian pools and spas (“terme”). More likely: pools require a swim cap (“cuffia”) and flip-flops by the water."
   },
   {
    "en": "Is this OK?",
    "ja": "Si può?",
    "ro": "",
    "say": "see PWOH",
    "when": "An all-purpose check: is it OK to sit here, to bring this in, to do this? Churches expect shoulders and knees covered."
   }
  ]
 },
 {
  "cat": "Emergencies",
  "items": [
   {
    "en": "Please help me",
    "ja": "Mi aiuti, per favore!",
    "ro": "",
    "say": "mee ah-YOO-tee, pehr fah-VOH-reh",
    "when": "For real trouble. In an emergency, shout “Aiuto!” (ah-YOO-toh). For a small favour, use “mi scusi”."
   },
   {
    "en": "I don't feel well",
    "ja": "Non mi sento bene",
    "ro": "",
    "say": "nohn mee SEN-toh BEH-neh",
    "when": "Pharmacies (a green cross) give advice and many medicines. A sign on the door lists the one open at night (“farmacia di turno”)."
   },
   {
    "en": "Where is a hospital?",
    "ja": "Dov'è l'ospedale?",
    "ro": "",
    "say": "doh-VEH loh-speh-DAH-leh",
    "when": "The emergency department is “pronto soccorso”. For a pharmacy, say “farmacia” (fahr-mah-CHEE-ah) in place of “l'ospedale”."
   },
   {
    "en": "I lost my passport",
    "ja": "Ho perso il passaporto",
    "ro": "",
    "say": "oh PEHR-soh eel pahs-sah-POR-toh",
    "when": "Swap in “il portafoglio” (wallet) or “il telefono” (phone). Report it to the police (Polizia or Carabinieri); you need their report (“denuncia”) for a new passport from your embassy or consulate."
   },
   {
    "en": "Please call an ambulance",
    "ja": "Chiami un'ambulanza!",
    "ro": "",
    "say": "KYAH-mee oon-ahm-boo-LAHN-tsah",
    "when": "112 is the emergency number for everything; 118 also reaches an ambulance directly."
   }
  ]
 }
],
};
export default it;
