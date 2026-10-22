/* Spanish phrase pack, as spoken in Spain. There are no recorded clips: the phone's own voice
   reads every phrase. */
import type { PhrasePack } from './types';

const es: PhrasePack = {
  lang: 'es',
  speechLang: 'es-ES',
  name: 'Spanish',
  intro: 'Vowels are short and clear: a “ah”, e “eh”, i “ee”, o “oh”, u “oo”. In most of Spain z, and c before e or i, sound like “th” (gracias is GRAH-thyahs), j is a throaty “h”, ll is “y”, v sounds like “b” and h is silent.',
  dictionary: { label: 'SpanishDict', url: 'https://www.spanishdict.com/translate/' },
  groups: [
 {
  "cat": "Basics",
  "items": [
   {
    "en": "Hello",
    "ja": "Hola",
    "ro": "",
    "say": "OH-lah",
    "when": "Works at any time of day, with anyone. Say it to shop staff as you walk in and to people in a lift; walking in without a word can come across as cold."
   },
   {
    "en": "Good morning",
    "ja": "Buenos días",
    "ro": "",
    "say": "BWEH-nohs DEE-ahs",
    "when": "Until lunch, which in Spain means until about 2 PM. Often shortened to just “buenas”."
   },
   {
    "en": "Good afternoon / Good evening",
    "ja": "Buenas tardes",
    "ro": "",
    "say": "BWEH-nahs TAHR-dehs",
    "when": "From lunch until it gets dark, which can be 9 PM or later in summer. After dark, and as goodnight, say “buenas noches”."
   },
   {
    "en": "Thank you",
    "ja": "Gracias",
    "ro": "",
    "say": "GRAH-thyahs",
    "when": "“Muchas gracias” is warmer. The usual answer is “de nada” (you're welcome)."
   },
   {
    "en": "Excuse me / Sorry",
    "ja": "Perdone",
    "ro": "",
    "say": "pehr-DOH-neh",
    "when": "Get a waiter's or a stranger's attention, or squeeze past someone. “Perdón” (pehr-DOHN) works too, and is enough for a small slip."
   },
   {
    "en": "I'm sorry",
    "ja": "Lo siento",
    "ro": "",
    "say": "loh SYEN-toh",
    "when": "A real apology, for when you bump into someone or make a mistake."
   },
   {
    "en": "Yes / No",
    "ja": "Sí / No",
    "ro": "",
    "say": "see / noh",
    "when": "“No, gracias” is the polite way to turn something down.",
    "tts": "Sí. No."
   },
   {
    "en": "No thanks, there's no need",
    "ja": "No hace falta, gracias",
    "ro": "",
    "say": "noh AH-theh FAHL-tah, GRAH-thyahs",
    "when": "Politely turn down a bag, a receipt or a flyer. When someone apologises to you, “no pasa nada” (it's fine) is the answer."
   },
   {
    "en": "Please",
    "ja": "Por favor",
    "ro": "",
    "say": "pohr fah-BOHR",
    "when": "Add it to any request. In bars people often order without it (“un café”), so a friendly tone matters more than the word."
   },
   {
    "en": "I don't understand",
    "ja": "No entiendo",
    "ro": "",
    "say": "noh en-TYEN-doh",
    "when": "When someone speaks to you in Spanish and you are lost. Say it with “perdone”."
   },
   {
    "en": "Do you speak English?",
    "ja": "¿Habla inglés?",
    "ro": "",
    "say": "AH-blah een-GLEHS",
    "when": "Ask before launching into English. Younger people in cities often do; in small towns and older bars, less so."
   },
   {
    "en": "Could you say that again, more slowly?",
    "ja": "¿Puede repetirlo más despacio, por favor?",
    "ro": "",
    "say": "PWEH-deh reh-peh-TEER-loh mahs dehs-PAH-thyoh, pohr fah-BOHR",
    "when": "Spanish is spoken fast. For when you nearly caught it."
   },
   {
    "en": "Where is the toilet?",
    "ja": "¿Dónde está el baño?",
    "ro": "",
    "say": "DOHN-deh ehs-TAH el BAH-nyoh",
    "when": "Signs say “aseos” or “servicios”. Public toilets are scarce; bars and cafés have them, so buy a coffee if you're not already a customer."
   },
   {
    "en": "Cheers!",
    "ja": "¡Salud!",
    "ro": "",
    "say": "sah-LOOD",
    "when": "Before the first sip. Look each person in the eye as you clink glasses."
   }
  ]
 },
 {
  "cat": "Eating out",
  "items": [
   {
    "en": "There are four of us",
    "ja": "Somos cuatro",
    "ro": "",
    "say": "SOH-mohs KWAH-troh",
    "when": "Staff ask how many (“¿cuántos sois?”). Lunch is about 2 to 4 PM and dinner from about 9 PM; many kitchens close in between."
   },
   {
    "en": "Do you have the menu in English?",
    "ja": "¿Tiene la carta en inglés?",
    "ro": "",
    "say": "TYEH-neh lah KAHR-tah en een-GLEHS",
    "when": "“La carta” is the menu. “El menú” usually means the set lunch (menú del día): starter, main, dessert and a drink, good value on weekdays."
   },
   {
    "en": "This one, please",
    "ja": "Esto, por favor",
    "ro": "",
    "say": "EHS-toh, pohr fah-BOHR",
    "when": "Point at the menu or at the tapas on the bar counter."
   },
   {
    "en": "Two of these, please",
    "ja": "Dos de estos, por favor",
    "ro": "",
    "say": "dohs deh EHS-tohs, pohr fah-BOHR",
    "when": "Counting: uno (1), dos (2), tres (3), cuatro (4). Many dishes come as a tapa (small), a media ración (half plate) or a ración (a full plate to share)."
   },
   {
    "en": "I'm vegetarian",
    "ja": "Soy vegetariano / vegetariana",
    "ro": "",
    "say": "soy beh-heh-tah-RYAH-noh / beh-heh-tah-RYAH-nah",
    "when": "Women say “vegetariana”. Ham and tuna turn up in salads, beans and vegetable dishes, so follow it with the next phrase.",
    "tts": "Soy vegetariano. Soy vegetariana."
   },
   {
    "en": "I don't eat meat or fish",
    "ja": "No como carne ni pescado",
    "ro": "",
    "say": "noh KOH-moh KAHR-neh nee pehs-KAH-doh",
    "when": "Clearer than “vegetarian”. Add “ni jamón” (or ham): it isn't always thought of as meat."
   },
   {
    "en": "Does this have meat or fish in it?",
    "ja": "¿Esto lleva carne o pescado?",
    "ro": "",
    "say": "EHS-toh YEH-bah KAHR-neh oh pehs-KAH-doh",
    "when": "Point at a dish and ask. “Lleva” means it does; “no lleva” means it doesn't."
   },
   {
    "en": "Is it made with meat or fish stock?",
    "ja": "¿Está hecho con caldo de carne o de pescado?",
    "ro": "",
    "say": "ehs-TAH EH-choh kohn KAHL-doh deh KAHR-neh oh deh pehs-KAH-doh",
    "when": "Soups, rice dishes such as paella, and stews are usually made with chicken, meat or fish stock (caldo), even with no pieces in them. Lentils and beans are often cooked with chorizo or ham."
   },
   {
    "en": "Without meat, please",
    "ja": "Sin carne, por favor",
    "ro": "",
    "say": "seen KAHR-neh, pohr fah-BOHR",
    "when": "Asks them to leave it out. Swap “carne” for “pescado” (fish) or “jamón” (ham). Dishes made ahead can't always be changed."
   },
   {
    "en": "Water, please",
    "ja": "Agua, por favor",
    "ro": "",
    "say": "AH-gwah, pohr fah-BOHR",
    "when": "You'll be asked “¿con gas o sin gas?” (sparkling or still). Tap water (“agua del grifo”) is free if you ask for it."
   },
   {
    "en": "It's delicious",
    "ja": "Está buenísimo",
    "ro": "",
    "say": "ehs-TAH bweh-NEE-see-moh",
    "when": "Say it to the server or the cook. “Riquísimo” means the same."
   },
   {
    "en": "Thank you, it was all delicious",
    "ja": "Muchas gracias, todo muy rico",
    "ro": "",
    "say": "MOO-chahs GRAH-thyahs, TOH-doh mwee REE-koh",
    "when": "Say it to the staff as you leave, then “hasta luego” (see you). Saying goodbye on the way out is expected, even in a busy bar."
   },
   {
    "en": "The bill, please",
    "ja": "La cuenta, por favor",
    "ro": "",
    "say": "lah KWEN-tah, pohr fah-BOHR",
    "when": "It won't come until you ask; lingering at the table is normal. Tipping isn't expected: rounding up or leaving a euro or two for good service is plenty."
   },
   {
    "en": "Can I pay by card?",
    "ja": "¿Puedo pagar con tarjeta?",
    "ro": "",
    "say": "PWEH-doh pah-GAHR kohn tahr-HEH-tah",
    "when": "Cards and phone payments work almost everywhere, even for one coffee. Some small bars and market stalls prefer cash."
   },
   {
    "en": "To take away, please",
    "ja": "Para llevar, por favor",
    "ro": "",
    "say": "PAH-rah yeh-BAHR, pohr fah-BOHR",
    "when": "At cafés and counters they ask whether it's for here (“para tomar aquí”) or to take away."
   }
  ]
 },
 {
  "cat": "Getting around",
  "items": [
   {
    "en": "Where is Atocha Station?",
    "ja": "¿Dónde está la estación de Atocha?",
    "ro": "",
    "say": "DOHN-deh ehs-TAH lah ehs-tah-THYOHN deh ah-TOH-chah",
    "when": "Swap in any place after “¿Dónde está…?”. Atocha is Madrid's main station for high-speed trains; Chamartín is the other big one."
   },
   {
    "en": "Does this train go to Toledo?",
    "ja": "¿Este tren va a Toledo?",
    "ro": "",
    "say": "EHS-teh trehn bah ah toh-LEH-doh",
    "when": "Ask staff or anyone on the platform before you board. Swap in your stop. On long-distance trains your ticket shows the coach (coche) and seat (plaza)."
   },
   {
    "en": "Which platform?",
    "ja": "¿De qué vía sale?",
    "ro": "",
    "say": "deh keh BEE-ah SAH-leh",
    "when": "Departure boards call the platform “vía”. For high-speed trains it shows up shortly before departure, and bags go through a scanner first, so arrive early."
   },
   {
    "en": "To this address, please",
    "ja": "A esta dirección, por favor",
    "ro": "",
    "say": "ah EHS-tah dee-rek-THYOHN, pohr fah-BOHR",
    "when": "For taxis. Show the address or map pin on your phone. A green light on the roof means the taxi is free."
   },
   {
    "en": "I'm getting off here",
    "ja": "Me bajo aquí",
    "ro": "",
    "say": "meh BAH-hoh ah-KEE",
    "when": "On a packed metro or bus, say it with “perdón” and people will make room. Someone behind you may ask “¿se baja?” (are you getting off?)."
   },
   {
    "en": "Is this seat free?",
    "ja": "¿Está libre este asiento?",
    "ro": "",
    "say": "ehs-TAH LEE-breh EHS-teh ah-SYEN-toh",
    "when": "For trains, buses and shared tables. For a chair on a bar terrace: “¿Está libre esta silla?”."
   },
   {
    "en": "I'm lost",
    "ja": "Me he perdido",
    "ro": "",
    "say": "meh eh pehr-DEE-doh",
    "when": "Then show where you are trying to go on your phone."
   }
  ]
 },
 {
  "cat": "Shopping",
  "items": [
   {
    "en": "How much is this?",
    "ja": "¿Cuánto cuesta?",
    "ro": "",
    "say": "KWAHN-toh KWEHS-tah",
    "when": "Prices on tags include tax (IVA). Haggling is only usual at flea markets such as Madrid's Rastro."
   },
   {
    "en": "Do you have this?",
    "ja": "¿Tiene esto?",
    "ro": "",
    "say": "TYEH-neh EHS-toh",
    "when": "Show a photo on your phone. Smaller shops often close for a few hours in the afternoon, roughly 2 to 5, and on Sundays."
   },
   {
    "en": "Can I have the tax refund form?",
    "ja": "¿Me puede dar el formulario de devolución del IVA?",
    "ro": "",
    "say": "meh PWEH-deh dahr el for-moo-LAH-ryoh deh deh-boh-loo-THYOHN del EE-bah",
    "when": "Visitors from outside the EU can get the tax back. Ask before you pay, with your passport; shops often just call it “tax free”. Validate the form at the airport (DIVA kiosks) before checking your bags, as you leave the EU."
   },
   {
    "en": "Can I try this on?",
    "ja": "¿Me lo puedo probar?",
    "ro": "",
    "say": "meh loh PWEH-doh proh-BAHR",
    "when": "The fitting rooms are “los probadores”."
   },
   {
    "en": "Do you have a bigger size?",
    "ja": "¿Tiene una talla más grande?",
    "ro": "",
    "say": "TYEH-neh OO-nah TAH-yah mahs GRAHN-deh",
    "when": "Spain uses EU sizes. For smaller, say “más pequeña” in place of “más grande”."
   },
   {
    "en": "I don't need a bag",
    "ja": "No necesito bolsa",
    "ro": "",
    "say": "noh neh-theh-SEE-toh BOHL-sah",
    "when": "Cashiers ask “¿quiere bolsa?” (do you want a bag?), which costs a few cents."
   },
   {
    "en": "I'm just looking",
    "ja": "Solo estoy mirando",
    "ro": "",
    "say": "SOH-loh ehs-TOY mee-RAHN-doh",
    "when": "If staff come over to help and you want to browse. Add “gracias”."
   }
  ]
 },
 {
  "cat": "Hotels",
  "items": [
   {
    "en": "I have a reservation",
    "ja": "Tengo una reserva",
    "ro": "",
    "say": "TEN-goh OO-nah reh-SEHR-bah",
    "when": "For checking in. Follow it with “a nombre de…” (under the name…). Have passports ready; hotels must record every guest's ID."
   },
   {
    "en": "Can you hold our bags?",
    "ja": "¿Nos puede guardar el equipaje?",
    "ro": "",
    "say": "nohs PWEH-deh gwahr-DAHR el eh-kee-PAH-heh",
    "when": "Before check-in time or after checkout. Nearly every hotel will."
   },
   {
    "en": "What's the Wi-Fi password?",
    "ja": "¿Cuál es la contraseña del wifi?",
    "ro": "",
    "say": "kwahl ehs lah kohn-trah-SEH-nyah del WEE-fee",
    "when": "Usually on a card in the room or at reception. In Spain “wifi” is said “WEE-fee”."
   }
  ]
 },
 {
  "cat": "Photos & baths",
  "items": [
   {
    "en": "May I take a photo?",
    "ja": "¿Puedo hacer una foto?",
    "ro": "",
    "say": "PWEH-doh ah-THEHR OO-nah FOH-toh",
    "when": "Ask before photographing people, and in small shops. Some churches and museums don't allow photos, or allow them without flash."
   },
   {
    "en": "Could you take our photo?",
    "ja": "¿Nos puede hacer una foto?",
    "ro": "",
    "say": "nohs PWEH-deh ah-THEHR OO-nah FOH-toh",
    "when": "Hand over the phone with the camera already open."
   },
   {
    "en": "Do I need a swim cap?",
    "ja": "¿Hace falta gorro de baño?",
    "ro": "",
    "say": "AH-theh FAHL-tah GOH-rroh deh BAH-nyoh",
    "when": "Ask at pools and spas before paying: indoor pools usually require a cap, and often flip-flops. Tattoos are rarely a problem in Spain."
   },
   {
    "en": "Is this allowed?",
    "ja": "¿Se puede?",
    "ro": "",
    "say": "seh PWEH-deh",
    "when": "An all-purpose check: can I sit here, bring this in, go in? Also what you say as you knock and open a door."
   }
  ]
 },
 {
  "cat": "Emergencies",
  "items": [
   {
    "en": "Please help me",
    "ja": "¡Ayúdeme, por favor!",
    "ro": "",
    "say": "ah-YOO-deh-meh, pohr fah-BOHR",
    "when": "For real trouble. For a small favour, “¿me puede ayudar?” (can you help me?) is gentler."
   },
   {
    "en": "I don't feel well",
    "ja": "Me encuentro mal",
    "ro": "",
    "say": "meh en-KWEN-troh mahl",
    "when": "Pharmacies (a green cross) give advice and sell many medicines without a prescription. One in each area stays open at night: the “farmacia de guardia”."
   },
   {
    "en": "Where is a hospital?",
    "ja": "¿Dónde hay un hospital?",
    "ro": "",
    "say": "DOHN-deh eye oon ohs-pee-TAHL",
    "when": "For a pharmacy, say “farmacia” in place of “un hospital”. The emergency department is “urgencias”."
   },
   {
    "en": "I lost my passport",
    "ja": "He perdido el pasaporte",
    "ro": "",
    "say": "eh pehr-DEE-doh el pah-sah-POHR-teh",
    "when": "Swap in “la cartera” (wallet) or “el móvil” (phone). Report it at a police station (comisaría): you need the report (denuncia) for a new passport and for insurance."
   },
   {
    "en": "Please call an ambulance",
    "ja": "¡Llame a una ambulancia, por favor!",
    "ro": "",
    "say": "YAH-meh ah OO-nah ahm-boo-LAHN-thyah, pohr fah-BOHR",
    "when": "112 is the number for any emergency: ambulance, fire or police. Operators can usually switch to English."
   }
  ]
 }
],
};
export default es;
