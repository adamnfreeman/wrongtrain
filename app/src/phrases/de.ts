/* German phrase pack. No recorded clips: every phrase uses the phone's own German voice.
   The "ja" field holds the German (it is named for the first pack). */
import type { PhrasePack } from './types';

const de: PhrasePack = {
  lang: 'de',
  speechLang: 'de-DE',
  name: 'German',
  intro: 'Say every letter, and a final e as a short “eh”. W sounds like “v”, v like “f”, z like “ts”, ei like “eye”, ie like “ee”, au like “ow” in “cow”, and ch (written kh here) is a soft hiss at the back of the throat.',
  dictionary: { label: 'dict.cc', url: 'https://www.dict.cc/?s=' },
  groups: [
 {
  "cat": "Basics",
  "items": [
   {
    "en": "Hello",
    "ja": "Guten Tag",
    "ro": "",
    "say": "GOO-ten TAHK",
    "when": "The polite daytime greeting; “Hallo” is fine almost anywhere. You'll hear “Grüß Gott” in Bavaria and “Moin” in the north. Say hello when you walk into a small shop."
   },
   {
    "en": "Good morning",
    "ja": "Guten Morgen",
    "ro": "",
    "say": "GOO-ten MOR-gen",
    "when": "Until about 10 or 11 AM. Good for hotel staff and the bakery."
   },
   {
    "en": "Good evening",
    "ja": "Guten Abend",
    "ro": "",
    "say": "GOO-ten AH-bent",
    "when": "From about 6 PM, in place of Guten Tag."
   },
   {
    "en": "Thank you",
    "ja": "Danke schön",
    "ro": "",
    "say": "DAHN-keh SHERN",
    "when": "Plain “Danke” works everywhere. People reply “Bitte” (you're welcome)."
   },
   {
    "en": "Excuse me / Sorry",
    "ja": "Entschuldigung",
    "ro": "",
    "say": "ent-SHOOL-dee-goong",
    "when": "Get someone's attention, squeeze past, or apologise for something small."
   },
   {
    "en": "I'm sorry",
    "ja": "Es tut mir leid",
    "ro": "",
    "say": "ess TOOT meer LITE",
    "when": "A real apology, for when you bump into someone or make a mistake."
   },
   {
    "en": "Yes / No",
    "ja": "Ja / Nein",
    "ro": "",
    "say": "YAH / NINE",
    "when": "“Nein, danke” is the polite way to turn something down."
   },
   {
    "en": "No thanks, I'm fine",
    "ja": "Nein danke, alles gut",
    "ro": "",
    "say": "NINE DAHN-keh, AH-less GOOT",
    "when": "Turn down a bag, a refill or a flyer. “Alles gut” alone also means “it's OK” when someone apologises to you."
   },
   {
    "en": "Please",
    "ja": "Bitte",
    "ro": "",
    "say": "BIT-teh",
    "when": "Add it after whatever you are asking for. It also means “you're welcome”, and “Bitte?” means “Pardon?”."
   },
   {
    "en": "I don't understand",
    "ja": "Ich verstehe nicht",
    "ro": "",
    "say": "ikh fair-SHTAY-eh nikht",
    "when": "When someone speaks to you in German and you are lost. Say it with Entschuldigung."
   },
   {
    "en": "Do you speak English?",
    "ja": "Sprechen Sie Englisch?",
    "ro": "",
    "say": "SHPREKH-en zee ENG-lish",
    "when": "Many Germans, especially younger ones, speak good English, but asking first is polite."
   },
   {
    "en": "Once more, slowly, please",
    "ja": "Noch einmal, langsam, bitte",
    "ro": "",
    "say": "nokh INE-mahl, LAHNG-zahm, BIT-teh",
    "when": "When you nearly caught it."
   },
   {
    "en": "Where is the toilet?",
    "ja": "Wo ist die Toilette?",
    "ro": "",
    "say": "voh ist dee toy-LET-teh",
    "when": "Station toilets often cost 50 cents to €1, so keep coins. Doors say Damen (women) and Herren (men)."
   },
   {
    "en": "Cheers!",
    "ja": "Prost!",
    "ro": "",
    "say": "PROHST",
    "when": "Look each person in the eye as you clink; skipping it is said to bring bad luck. With wine, people often say “Zum Wohl”."
   }
  ]
 },
 {
  "cat": "Eating out",
  "items": [
   {
    "en": "Four people",
    "ja": "Vier Personen, bitte",
    "ro": "",
    "say": "FEER pair-ZOH-nen, BIT-teh",
    "when": "In casual places and beer gardens you usually seat yourself, and sharing a long table with strangers is normal."
   },
   {
    "en": "Do you have an English menu?",
    "ja": "Haben Sie eine englische Speisekarte?",
    "ro": "",
    "say": "HAH-ben zee INE-eh ENG-lish-eh SHPY-zeh-kar-teh",
    "when": "Common in big cities and tourist areas. “Die Karte” on its own also means the menu."
   },
   {
    "en": "This one, please",
    "ja": "Das hier, bitte",
    "ro": "",
    "say": "DAHS heer, BIT-teh",
    "when": "Point at the menu or at the counter."
   },
   {
    "en": "Two of these, please",
    "ja": "Zwei davon, bitte",
    "ro": "",
    "say": "TSVY dah-FON, BIT-teh",
    "when": "Counting: eins (1), zwei (2), drei (3), vier (4). Germans count from the thumb, so a thumb alone means one and thumb plus finger means two."
   },
   {
    "en": "I'm vegetarian",
    "ja": "Ich bin Vegetarier / Vegetarierin",
    "ro": "",
    "say": "ikh bin veh-geh-TAH-ree-er / veh-geh-TAH-ree-er-in",
    "when": "Men say Vegetarier, women Vegetarierin. Widely understood, and many menus mark dishes vegetarisch or vegan."
   },
   {
    "en": "I don't eat meat or fish",
    "ja": "Ich esse kein Fleisch und keinen Fisch",
    "ro": "",
    "say": "ikh ESS-eh kine FLYSH oont KINE-en FISH",
    "when": "Clearer than “vegetarian”. Bacon (Speck) turns up in potato dishes, salads and soups that sound meat-free."
   },
   {
    "en": "Does this have meat or fish in it?",
    "ja": "Ist da Fleisch oder Fisch drin?",
    "ro": "",
    "say": "ist dah FLYSH oh-der FISH DRIN",
    "when": "Point at a dish and ask. “Ja” means it does; “Nein” means it doesn't."
   },
   {
    "en": "Is it made with meat or fish stock?",
    "ja": "Ist das mit Fleisch- oder Fischbrühe gemacht?",
    "ro": "",
    "say": "ist dahs mit FLYSH oh-der FISH-brew-eh geh-MAHKHT",
    "when": "Soups, sauces and gravy (Soße), even vegetable soups, are often made with beef or chicken stock. Gemüsebrühe is vegetable stock."
   },
   {
    "en": "Without meat, please",
    "ja": "Ohne Fleisch, bitte",
    "ro": "",
    "say": "OH-neh FLYSH, BIT-teh",
    "when": "Asks them to leave it out. Swap “Fleisch” for “Speck” (bacon) or “Fisch” (fish)."
   },
   {
    "en": "Water, please",
    "ja": "Ein Wasser, bitte",
    "ro": "",
    "say": "ine VAHS-er, BIT-teh",
    "when": "Water is not free; you get bottled water and are asked “mit oder ohne Kohlensäure?” (sparkling or still). Tap water is Leitungswasser, and some places won't serve it."
   },
   {
    "en": "It's delicious",
    "ja": "Das schmeckt sehr gut",
    "ro": "",
    "say": "dahs SHMEKT zair GOOT",
    "when": "Servers ask “Hat es geschmeckt?” (did you enjoy it?) when they clear the plates. “Ja, sehr gut, danke” is the answer."
   },
   {
    "en": "Thank you for the meal",
    "ja": "Vielen Dank, es war sehr lecker",
    "ro": "",
    "say": "FEE-len DAHNK, ess var zair LEK-er",
    "when": "Say it to the staff as you leave. Before eating, people wish each other “Guten Appetit”."
   },
   {
    "en": "The bill, please",
    "ja": "Die Rechnung, bitte",
    "ro": "",
    "say": "dee REKH-noong, BIT-teh",
    "when": "The bill only comes when you ask. You'll be asked “Zusammen oder getrennt?” (together or separate); splitting is normal. Tip by rounding up or adding 5 to 10%: say the total you want to pay as you hand over the money, rather than leaving it on the table."
   },
   {
    "en": "Can I pay by card?",
    "ja": "Kann ich mit Karte zahlen?",
    "ro": "",
    "say": "kahn ikh mit KAR-teh TSAH-len",
    "when": "Cash is still common: many bakeries, cafés, small restaurants and beer gardens take cash only or have a card minimum. Ask before you order."
   },
   {
    "en": "To take away, please",
    "ja": "Zum Mitnehmen, bitte",
    "ro": "",
    "say": "tsoom MIT-nay-men, BIT-teh",
    "when": "At bakeries and counters they ask “Hier essen oder zum Mitnehmen?” (eat here or take away)."
   }
  ]
 },
 {
  "cat": "Getting around",
  "items": [
   {
    "en": "Where is Berlin Hauptbahnhof?",
    "ja": "Wo ist der Berliner Hauptbahnhof?",
    "ro": "",
    "say": "voh ist dair bair-LEE-ner HOWPT-bahn-hohf",
    "when": "Hauptbahnhof (Hbf) is a city's main station. Put any place after “Wo ist”."
   },
   {
    "en": "Does this train go to Potsdam?",
    "ja": "Fährt dieser Zug nach Potsdam?",
    "ro": "",
    "say": "FAIRT DEE-zer TSOOK nahkh POTS-dahm",
    "when": "Swap in your stop. Paper tickets for local transport often need stamping in a machine before you board; inspectors in plain clothes fine you on the spot."
   },
   {
    "en": "Which platform?",
    "ja": "Welches Gleis?",
    "ro": "",
    "say": "VEL-khes GLICE",
    "when": "Platform changes are common, so check the board and listen for “Gleiswechsel”. Letters along the platform (A to G) show where your carriage stops."
   },
   {
    "en": "To here, please",
    "ja": "Hierhin, bitte",
    "ro": "",
    "say": "HEER-hin, BIT-teh",
    "when": "For taxis. Show the address or map pin on your phone. Ask before you get in if you want to pay by card, and round up as a tip."
   },
   {
    "en": "I'm getting off",
    "ja": "Ich steige hier aus",
    "ro": "",
    "say": "ikh SHTY-geh heer OWS",
    "when": "On a packed train or bus, say it with Entschuldigung. Doors often don't open by themselves: press the button."
   },
   {
    "en": "Is this seat free?",
    "ja": "Ist hier noch frei?",
    "ro": "",
    "say": "ist HEER nokh FRY",
    "when": "On long-distance trains, a display above each seat shows whether it is reserved and for which stretch. Also for shared tables in beer gardens."
   },
   {
    "en": "I'm lost",
    "ja": "Ich habe mich verlaufen",
    "ro": "",
    "say": "ikh HAH-beh mikh fair-LOW-fen",
    "when": "Then show where you are trying to go. People are usually glad to help."
   }
  ]
 },
 {
  "cat": "Shopping",
  "items": [
   {
    "en": "How much is this?",
    "ja": "Was kostet das?",
    "ro": "",
    "say": "vahs KOSS-tet dahs",
    "when": "Prices already include tax. Haggling is only for flea markets (Flohmarkt)."
   },
   {
    "en": "Do you have this?",
    "ja": "Haben Sie das?",
    "ro": "",
    "say": "HAH-ben zee DAHS",
    "when": "Show a photo on your phone. Most shops are closed on Sundays; shops in stations and airports are the exception."
   },
   {
    "en": "The tax refund form, please",
    "ja": "Ein Tax-Free-Formular, bitte",
    "ro": "",
    "say": "ine TAX-free for-moo-LAHR, BIT-teh",
    "when": "For visitors who live outside the EU, on more than €50 at one shop, with your passport. Get the form stamped by customs (Zoll) at the airport before checking your bags, with the goods unused."
   },
   {
    "en": "Can I try this on?",
    "ja": "Kann ich das anprobieren?",
    "ro": "",
    "say": "kahn ikh dahs AHN-proh-bee-ren",
    "when": "The fitting room is the Umkleide."
   },
   {
    "en": "Do you have a bigger size?",
    "ja": "Haben Sie das eine Nummer größer?",
    "ro": "",
    "say": "HAH-ben zee dahs INE-eh NOOM-er GRER-ser",
    "when": "For smaller, say “kleiner” (KLY-ner) in place of “größer”. Clothes and shoes use EU sizes."
   },
   {
    "en": "I don't need a bag",
    "ja": "Ich brauche keine Tüte",
    "ro": "",
    "say": "ikh BROW-kheh KY-neh TEW-teh",
    "when": "Bags cost extra, so carry your own. Supermarket cashiers are fast: pack up at the shelf past the till."
   },
   {
    "en": "I'm just looking",
    "ja": "Ich schaue nur",
    "ro": "",
    "say": "ikh SHOW-eh NOOR",
    "when": "If staff come over to help and you want to browse."
   }
  ]
 },
 {
  "cat": "Hotels",
  "items": [
   {
    "en": "Checking in, please",
    "ja": "Ich möchte einchecken",
    "ro": "",
    "say": "ikh MERKH-teh INE-chek-en",
    "when": "Have passports ready; foreign guests fill in a registration form. Many cities add a city tax per night, sometimes paid at the desk."
   },
   {
    "en": "Can you hold our bags?",
    "ja": "Können Sie unser Gepäck aufbewahren?",
    "ro": "",
    "say": "KERN-en zee OON-zer geh-PEK OWF-beh-vah-ren",
    "when": "Before check-in time or after checkout. Big stations also have lockers (Schließfächer)."
   },
   {
    "en": "What's the Wi-Fi password?",
    "ja": "Wie ist das WLAN-Passwort?",
    "ro": "",
    "say": "vee ist dahs VAY-lahn PAHSS-vort",
    "when": "Germans call Wi-Fi “WLAN”. Usually on a card in the room."
   }
  ]
 },
 {
  "cat": "Photos & baths",
  "items": [
   {
    "en": "May I take a photo?",
    "ja": "Darf ich ein Foto machen?",
    "ro": "",
    "say": "DARF ikh ine FOH-toh MAHKH-en",
    "when": "Ask before photographing people; privacy matters a lot here. Some museums and churches don't allow photos."
   },
   {
    "en": "Could you take our photo?",
    "ja": "Könnten Sie ein Foto von uns machen?",
    "ro": "",
    "say": "KERN-ten zee ine FOH-toh fon OONS MAHKH-en",
    "when": "Hand over the phone with the camera already open."
   },
   {
    "en": "Are tattoos OK?",
    "ja": "Sind Tattoos hier in Ordnung?",
    "ro": "",
    "say": "zint teh-TOOS heer in ORD-noong",
    "when": "Tattoos are rarely a problem in Germany. Saunas have stricter rules: usually nude and mixed, no swimwear, and you sit on your own towel."
   },
   {
    "en": "Is this OK?",
    "ja": "Ist das in Ordnung?",
    "ro": "",
    "say": "ist DAHS in ORD-noong",
    "when": "An all-purpose check: is it OK to sit here, to bring this in, to do this?"
   }
  ]
 },
 {
  "cat": "Emergencies",
  "items": [
   {
    "en": "Please help me",
    "ja": "Können Sie mir bitte helfen?",
    "ro": "",
    "say": "KERN-en zee meer BIT-teh HEL-fen",
    "when": "In real danger, shout “Hilfe!” (HIL-feh)."
   },
   {
    "en": "I don't feel well",
    "ja": "Mir geht es nicht gut",
    "ro": "",
    "say": "meer GAYT ess nikht GOOT",
    "when": "Even basic painkillers are sold only in a pharmacy (Apotheke, red A sign). A closed one posts the nearest pharmacy open tonight."
   },
   {
    "en": "Where is a hospital?",
    "ja": "Wo ist hier ein Krankenhaus?",
    "ro": "",
    "say": "voh ist heer ine KRAHN-ken-house",
    "when": "For a pharmacy, say “Apotheke” (ah-poh-TAY-keh). The emergency department is the Notaufnahme."
   },
   {
    "en": "I lost my passport",
    "ja": "Ich habe meinen Pass verloren",
    "ro": "",
    "say": "ikh HAH-beh MY-nen PAHSS fair-LOH-ren",
    "when": "Swap in “mein Handy” (phone) or “meine Geldbörse” (wallet). Report it to the police; lost things are often handed in to the Fundbüro (lost property office)."
   },
   {
    "en": "Please call an ambulance",
    "ja": "Rufen Sie bitte einen Krankenwagen!",
    "ro": "",
    "say": "ROO-fen zee BIT-teh INE-en KRAHN-ken-vah-gen",
    "when": "Emergency numbers: 112 for ambulance or fire, 110 for police."
   }
  ]
 }
],
};
export default de;
