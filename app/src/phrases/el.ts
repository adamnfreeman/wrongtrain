/* Greek phrase pack. There are no recorded clips: every phrase uses the phone's own Greek voice
   (the "tts" text where it differs from the written phrase). Greek writes its question mark as ";". */
import type { PhrasePack } from './types';

const el: PhrasePack = {
  lang: 'el',
  speechLang: 'el-GR',
  name: 'Greek',
  intro: 'Say every letter, and stress the syllable with the accent mark (in capitals in the sounds-like spelling); the wrong stress can make a different word. In the sounds-like spelling, “dh” is the “th” in “this”, “th” the “th” in “thin”, and “h” a breathy sound like the “ch” in Scottish “loch”.',
  dictionary: { label: 'WordReference', url: 'https://www.wordreference.com/gren/' },
  groups: [
 {
  "cat": "Basics",
  "items": [
   {
    "en": "Hello",
    "ja": "Γεια σας",
    "ro": "Yia sas",
    "say": "YAH sahs",
    "when": "The polite form, for staff and strangers; “yia sou” is for friends. It also means goodbye. Say it as you walk into a small shop."
   },
   {
    "en": "Good morning",
    "ja": "Καλημέρα",
    "ro": "Kaliméra",
    "say": "kah-lee-MEH-rah",
    "when": "Until about noon. Say it to everyone: the bakery, the hotel desk, neighbours on the stairs."
   },
   {
    "en": "Good evening",
    "ja": "Καλησπέρα",
    "ro": "Kalispéra",
    "say": "kah-lee-SPEH-rah",
    "when": "From late afternoon on. “Kaliníchta” (good night) is only for leaving at the end of the night."
   },
   {
    "en": "Thank you",
    "ja": "Ευχαριστώ",
    "ro": "Efcharistó",
    "say": "ef-hah-ree-STOH",
    "when": "Use it constantly. “Efcharistó polí” is thank you very much. The reply you'll hear is “parakaló” (you're welcome)."
   },
   {
    "en": "Excuse me / Sorry",
    "ja": "Συγγνώμη",
    "ro": "Signómi",
    "say": "seeg-NOH-mee",
    "when": "The most useful word to learn. Get a waiter's attention, squeeze past someone, or apologise for something small."
   },
   {
    "en": "I'm sorry",
    "ja": "Λυπάμαι πολύ",
    "ro": "Lipáme polí",
    "say": "lee-PAH-meh poh-LEE",
    "when": "A real apology, for when you bump into someone or make a mistake. For small things, signómi is enough."
   },
   {
    "en": "Yes / No",
    "ja": "Ναι / Όχι",
    "ro": "Ne / Óchi",
    "say": "neh / OH-hee",
    "when": "Careful: “ne” means yes. Many Greeks say no with a small upward nod of the head, often raising the eyebrows or clicking the tongue.",
    "tts": "Ναι. Όχι."
   },
   {
    "en": "No thanks, I'm fine",
    "ja": "Δεν χρειάζεται, ευχαριστώ",
    "ro": "Den chriázete, efcharistó",
    "say": "dhen hree-AH-zeh-teh, ef-hah-ree-STOH",
    "when": "“It's not needed, thanks”: politely turn down a bag, a receipt, a refill or a flyer. When someone apologises to you, “den pirázi” means “it's fine”."
   },
   {
    "en": "Please",
    "ja": "Παρακαλώ",
    "ro": "Parakaló",
    "say": "pah-rah-kah-LOH",
    "when": "Add it to any request. It also means “you're welcome”, and staff say it to ask what you'd like."
   },
   {
    "en": "I don't understand",
    "ja": "Δεν καταλαβαίνω",
    "ro": "Den katalavéno",
    "say": "dhen kah-tah-lah-VEH-noh",
    "when": "When someone speaks to you in Greek and you are lost. Say it with signómi."
   },
   {
    "en": "Do you speak English?",
    "ja": "Μιλάτε αγγλικά;",
    "ro": "Miláte angliká?",
    "say": "mee-LAH-teh ahn-glee-KAH",
    "when": "Most people in cities and tourist areas speak good English, but asking first is polite, especially with older people."
   },
   {
    "en": "Once more, slowly, please",
    "ja": "Ξανά, πιο αργά, παρακαλώ",
    "ro": "Xaná, pio argá, parakaló",
    "say": "ksah-NAH, pyoh ahr-GAH, pah-rah-kah-LOH",
    "when": "When you nearly caught it."
   },
   {
    "en": "Where is the toilet?",
    "ja": "Πού είναι η τουαλέτα;",
    "ro": "Pou íne i toualéta?",
    "say": "poo EE-neh ee too-ah-LEH-tah",
    "when": "Cafés expect you to order something first. In much of Greece toilet paper goes in the bin, not down the toilet: the pipes are narrow."
   },
   {
    "en": "Cheers!",
    "ja": "Γεια μας!",
    "ro": "Yia mas!",
    "say": "YAH mahs",
    "when": "“To our health”. Look people in the eye as you clink glasses."
   }
  ]
 },
 {
  "cat": "Eating out",
  "items": [
   {
    "en": "Four people",
    "ja": "Τέσσερα άτομα",
    "ro": "Téssera átoma",
    "say": "TEH-seh-rah AH-toh-mah",
    "when": "Staff ask “póssa átoma?” (how many?). Holding up four fingers works, but never push an open palm at someone: that is the moútza, a rude gesture."
   },
   {
    "en": "Do you have an English menu?",
    "ja": "Έχετε μενού στα αγγλικά;",
    "ro": "Échete menoú sta angliká?",
    "say": "EH-heh-teh meh-NOO stah ahn-glee-KAH",
    "when": "Most places do. In small tavernas the waiter may just say what's cooked today, or take you to the kitchen to look."
   },
   {
    "en": "This one, please",
    "ja": "Αυτό, παρακαλώ",
    "ro": "Aftó, parakaló",
    "say": "ahf-TOH, pah-rah-kah-LOH",
    "when": "Point at the menu or the food behind the counter."
   },
   {
    "en": "Two of these, please",
    "ja": "Δύο από αυτά, παρακαλώ",
    "ro": "Dío apó aftá, parakaló",
    "say": "DHEE-oh ah-POH ahf-TAH, pah-rah-kah-LOH",
    "when": "Counting: éna (1), dío (2), tría (3), téssera (4)."
   },
   {
    "en": "I'm vegetarian",
    "ja": "Είμαι χορτοφάγος",
    "ro": "Íme chortofágos",
    "say": "EE-meh hor-toh-FAH-gohs",
    "when": "The same word for men and women. Greek food has many meat-free dishes; in Orthodox fasting times menus mark “nistísima”, with no meat, dairy or eggs (but often octopus or squid)."
   },
   {
    "en": "I don't eat meat or fish",
    "ja": "Δεν τρώω κρέας ούτε ψάρι",
    "ro": "Den tróo kréas oúte psári",
    "say": "dhen TROH-oh KREH-ahs OO-teh PSAH-ree",
    "when": "Clearer than “vegetarian”. Say it when ordering, before the food is made."
   },
   {
    "en": "Does this have meat or fish in it?",
    "ja": "Έχει κρέας ή ψάρι μέσα;",
    "ro": "Échi kréas i psári mésa?",
    "say": "EH-hee KREH-ahs ee PSAH-ree MEH-sah",
    "when": "Point at a dish and ask. “Ne, échi” means it does; “óchi, den échi” means it doesn't."
   },
   {
    "en": "Is it made with meat or fish stock?",
    "ja": "Έχει ζωμό από κρέας ή ψάρι;",
    "ro": "Échi zomó apó kréas i psári?",
    "say": "EH-hee zoh-MOH ah-POH KREH-ahs ee PSAH-ree",
    "when": "Soups, pilafs and other rice dishes are often cooked in chicken or meat stock (zomós), and stuffed vegetables (gemistá) sometimes have mince."
   },
   {
    "en": "Without meat, please",
    "ja": "Χωρίς κρέας, παρακαλώ",
    "ro": "Chorís kréas, parakaló",
    "say": "hoh-REES KREH-ahs, pah-rah-kah-LOH",
    "when": "Swap “kréas” for “psári” (fish) or “tirí” (cheese). Salads and many dishes come with feta unless you ask."
   },
   {
    "en": "Water, please",
    "ja": "Νερό, παρακαλώ",
    "ro": "Neró, parakaló",
    "say": "neh-ROH, pah-rah-kah-LOH",
    "when": "Many places bring a bottle and charge for it. Tap water is safe in Athens; on some islands people drink bottled."
   },
   {
    "en": "It's delicious",
    "ja": "Είναι πολύ νόστιμο",
    "ro": "Íne polí nóstimo",
    "say": "EE-neh poh-LEE NOH-stee-moh",
    "when": "Say it to the cook or the server. Family tavernas love hearing it."
   },
   {
    "en": "Thank you, it was all wonderful",
    "ja": "Ευχαριστούμε, ήταν όλα υπέροχα",
    "ro": "Efcharistoúme, ítan óla ipérocha",
    "say": "ef-hah-ree-STOO-meh, EE-tahn OH-lah ee-PEH-roh-hah",
    "when": "Say it to the staff as you leave. Tavernas often bring a free dessert or a small carafe of raki or tsipouro with the bill."
   },
   {
    "en": "The bill, please",
    "ja": "Τον λογαριασμό, παρακαλώ",
    "ro": "Ton logariasmó, parakaló",
    "say": "tohn loh-gahr-yahz-MOH, pah-rah-kah-LOH",
    "when": "It won't come until you ask; lingering is normal. Tips aren't expected, but rounding up or leaving 5 to 10% for good service is common."
   },
   {
    "en": "Can I pay by card?",
    "ja": "Μπορώ να πληρώσω με κάρτα;",
    "ro": "Boró na pliróso me kárta?",
    "say": "boh-ROH nah plee-ROH-soh meh KAHR-tah",
    "when": "Businesses must accept cards and most do, but keep some cash for kiosks (períptera), villages and tips."
   },
   {
    "en": "To take away, please",
    "ja": "Για πακέτο, παρακαλώ",
    "ro": "Ya pakéto, parakaló",
    "say": "yah pah-KEH-toh, pah-rah-kah-LOH",
    "when": "At cafés and souvlaki shops they ask “edó í pakéto?” (here or to take away?)."
   }
  ]
 },
 {
  "cat": "Getting around",
  "items": [
   {
    "en": "Where is Larissis station?",
    "ja": "Πού είναι ο Σταθμός Λαρίσης;",
    "ro": "Pou íne o Stathmós Larísis?",
    "say": "poo EE-neh oh stahth-MOHS lah-REE-sees",
    "when": "Athens' main railway station, also a stop on metro line 2 (red). Swap in any place after “pou íne”."
   },
   {
    "en": "Does this train go to Piraeus?",
    "ja": "Αυτό το τρένο πάει στον Πειραιά;",
    "ro": "Aftó to tréno pái ston Pireá?",
    "say": "ahf-TOH toh TREH-noh PAH-ee stohn pee-reh-AH",
    "when": "Ask on the platform before you board. Metro lines 1 (green) and 3 (blue) both go to Piraeus, the port for most ferries."
   },
   {
    "en": "Which platform?",
    "ja": "Από ποια γραμμή φεύγει;",
    "ro": "Apó pia grammí févgi?",
    "say": "ah-POH pyah grah-MEE FEV-yee",
    "when": "“Which track does it leave from?” Departure boards show the track as “grammí”. Show your ticket or the stop on your phone as you ask."
   },
   {
    "en": "To this address, please",
    "ja": "Σε αυτή τη διεύθυνση, παρακαλώ",
    "ro": "Se aftí ti diéfthinsi, parakaló",
    "say": "seh ahf-TEE tee dhee-EF-theen-see, pah-rah-kah-LOH",
    "when": "For taxis: show the address or map pin on your phone. Check the meter is running, or use a taxi app."
   },
   {
    "en": "I'm getting off",
    "ja": "Κατεβαίνω",
    "ro": "Katevéno",
    "say": "kah-teh-VEH-noh",
    "when": "On a crowded bus or metro, say it with signómi and people will make room. On buses, press the button to stop."
   },
   {
    "en": "Is this seat free?",
    "ja": "Είναι ελεύθερη αυτή η θέση;",
    "ro": "Íne eléftheri aftí i thési?",
    "say": "EE-neh eh-LEF-theh-ree ahf-TEE ee THEH-see",
    "when": "For buses, ferry decks and shared café tables."
   },
   {
    "en": "I'm lost",
    "ja": "Χάθηκα",
    "ro": "Cháthika",
    "say": "HAH-thee-kah",
    "when": "Then show where you are trying to go. People are usually glad to help, and may walk you there."
   }
  ]
 },
 {
  "cat": "Shopping",
  "items": [
   {
    "en": "How much is this?",
    "ja": "Πόσο κάνει αυτό;",
    "ro": "Póso káni aftó?",
    "say": "POH-soh KAH-nee ahf-TOH",
    "when": "Useful at markets, such as the weekly street market (laikí). Haggling isn't usual in shops."
   },
   {
    "en": "Do you have this?",
    "ja": "Έχετε αυτό;",
    "ro": "Échete aftó?",
    "say": "EH-heh-teh ahf-TOH",
    "when": "Show a photo on your phone. Works well in pharmacies with a photo of the box."
   },
   {
    "en": "The tax refund form, please",
    "ja": "Το έντυπο για επιστροφή φόρου, παρακαλώ",
    "ro": "To éndipo ya epistrofí fórou, parakaló",
    "say": "toh EN-dee-poh yah eh-pee-stroh-FEE FOH-roo, pah-rah-kah-LOH",
    "when": "If you live outside the EU, shops marked Tax Free fill in a form above a minimum spend (about €50), with your passport. Get it stamped at customs at the airport before checking your bags."
   },
   {
    "en": "Can I try this on?",
    "ja": "Μπορώ να το δοκιμάσω;",
    "ro": "Boró na to dokimáso?",
    "say": "boh-ROH nah toh dhoh-kee-MAH-soh",
    "when": "Also means “can I taste it?” at markets and food shops."
   },
   {
    "en": "Do you have a bigger size?",
    "ja": "Το έχετε σε μεγαλύτερο νούμερο;",
    "ro": "To échete se megalítero noúmero?",
    "say": "toh EH-heh-teh seh meh-gah-LEE-teh-roh NOO-meh-roh",
    "when": "Sizes are European. For smaller, say “mikrótero” in place of “megalítero”."
   },
   {
    "en": "I don't need a bag",
    "ja": "Δεν χρειάζομαι σακούλα",
    "ro": "Den chriázome sakoúla",
    "say": "dhen hree-AH-zoh-meh sah-KOO-lah",
    "when": "Plastic bags cost a few cents, so cashiers ask “sakoúla?”."
   },
   {
    "en": "I'm just looking",
    "ja": "Απλώς κοιτάζω",
    "ro": "Aplós kitázo",
    "say": "ah-PLOHS kee-TAH-zoh",
    "when": "If staff come over to help and you want to browse. Add “efcharistó”."
   }
  ]
 },
 {
  "cat": "Hotels",
  "items": [
   {
    "en": "Checking in, please",
    "ja": "Θα ήθελα να κάνω check-in, παρακαλώ",
    "ro": "Tha íthela na káno check-in, parakaló",
    "say": "thah EE-theh-lah nah KAH-noh chek-EEN, pah-rah-kah-LOH",
    "when": "Have passports ready; hotels register them. Most charge a small climate fee per night, often paid at the desk.",
    "tts": "Θα ήθελα να κάνω τσεκ ιν, παρακαλώ."
   },
   {
    "en": "Can you hold our bags?",
    "ja": "Μπορείτε να κρατήσετε τις βαλίτσες μας;",
    "ro": "Boríte na kratísete tis valítses mas?",
    "say": "boh-REE-teh nah krah-TEE-seh-teh tees vah-LEET-sehs mahs",
    "when": "Before check-in time or after checkout. Most hotels will, and Athens and the ferry ports have paid luggage storage."
   },
   {
    "en": "What's the Wi-Fi password?",
    "ja": "Ποιος είναι ο κωδικός για το Wi-Fi;",
    "ro": "Pios íne o kodikós ya to Wi-Fi?",
    "say": "pyohs EE-neh oh koh-dhee-KOHS yah toh WAI-fai",
    "when": "Usually on a card in the room. Cafés often print it on the receipt.",
    "tts": "Ποιος είναι ο κωδικός για το γουάι φάι;"
   }
  ]
 },
 {
  "cat": "Photos & baths",
  "items": [
   {
    "en": "May I take a photo?",
    "ja": "Μπορώ να βγάλω φωτογραφία;",
    "ro": "Boró na vgálo fotografía?",
    "say": "boh-ROH nah VGAH-loh foh-toh-grah-FEE-ah",
    "when": "Ask before photographing people, and in churches and monasteries, where photos may not be allowed. Never near military sites, which are signed."
   },
   {
    "en": "Could you take our photo?",
    "ja": "Μπορείτε να μας βγάλετε μια φωτογραφία;",
    "ro": "Boríte na mas vgálete mia fotografía?",
    "say": "boh-REE-teh nah mahs VGAH-leh-teh myah foh-toh-grah-FEE-ah",
    "when": "Hand over the phone with the camera already open."
   },
   {
    "en": "Do I need a swim cap for the pool?",
    "ja": "Χρειάζομαι σκουφάκι για την πισίνα;",
    "ro": "Chriázome skoufáki ya tin pisína?",
    "say": "hree-AH-zoh-meh skoo-FAH-kee yah teen pee-SEE-nah",
    "when": "Public pools and some indoor hotel pools and spas insist on one. Tattoos are no problem in Greece."
   },
   {
    "en": "Is this OK?",
    "ja": "Είναι εντάξει αυτό;",
    "ro": "Íne entáxi aftó?",
    "say": "EE-neh en-DAHK-see ahf-TOH",
    "when": "An all-purpose check: is it OK to sit here, to bring this in, to do this? “Entáxi” (OK) is a word you'll hear all day."
   }
  ]
 },
 {
  "cat": "Emergencies",
  "items": [
   {
    "en": "Please help me",
    "ja": "Βοηθήστε με, παρακαλώ",
    "ro": "Voithíste me, parakaló",
    "say": "voh-ee-THEE-steh meh, pah-rah-kah-LOH",
    "when": "For real trouble; shout “voíthia!” (help!). For a small favour, start with signómi."
   },
   {
    "en": "I don't feel well",
    "ja": "Δεν νιώθω καλά",
    "ro": "Den niótho kalá",
    "say": "dhen NYOH-thoh kah-LAH",
    "when": "Pharmacies (green cross) are everywhere and give good advice. At night, a notice on each pharmacy's door says which one nearby is open."
   },
   {
    "en": "Where is a hospital?",
    "ja": "Πού είναι το νοσοκομείο;",
    "ro": "Pou íne to nosokomío?",
    "say": "poo EE-neh toh noh-soh-koh-MEE-oh",
    "when": "For a pharmacy, say “farmakío” in place of “nosokomío”."
   },
   {
    "en": "I lost my passport",
    "ja": "Έχασα το διαβατήριό μου",
    "ro": "Échasa to diavatírió mou",
    "say": "EH-hah-sah toh dhee-ah-vah-TEE-ree-OH moo",
    "when": "Swap in “to portofóli mou” (my wallet) or “to kinitó mou” (my phone). Report it to the police (the Tourist Police are on 171), then your embassy for a passport."
   },
   {
    "en": "Please call an ambulance",
    "ja": "Καλέστε ένα ασθενοφόρο, παρακαλώ",
    "ro": "Kaléste éna asthenofóro, parakaló",
    "say": "kah-LEH-steh EH-nah ahs-theh-noh-FOH-roh, pah-rah-kah-LOH",
    "when": "112 works for any emergency, in English. In Greece also: 166 ambulance, 100 police, 199 fire."
   }
  ]
 }
],
};
export default el;
