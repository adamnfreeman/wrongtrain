/* French phrase pack, as said in France (vous for strangers). No recorded clips: every phrase uses
   the phone's own voice. The "ja" field holds the French; it is named for the first pack. */
import type { PhrasePack } from './types';

const fr: PhrasePack = {
  lang: 'fr',
  speechLang: 'fr-FR',
  name: 'French',
  intro: 'Final consonants are mostly silent, and the stress falls lightly on the last syllable. In the spellings, “ahn”, “ohn” and “an” are nasal (hum the vowel, don\'t sound the n), “zh” is the s in “measure”, and “ew” is “ee” said with rounded lips.',
  dictionary: { label: 'WordReference', url: 'https://www.wordreference.com/fren/' },
  groups: [
 {
  "cat": "Basics",
  "items": [
   {
    "en": "Hello",
    "ja": "Bonjour",
    "ro": "",
    "say": "bohn-ZHOOR",
    "when": "Say it every time you walk into a shop, café or bakery, and to the driver as you board a bus. Skipping it comes across as rude."
   },
   {
    "en": "Good morning",
    "ja": "Bonjour, madame / Bonjour, monsieur",
    "ro": "",
    "say": "bohn-ZHOOR, mah-DAHM / bohn-ZHOOR, muh-SYUH",
    "when": "French has no separate morning greeting: bonjour does all day until evening. Adding madame or monsieur makes it more polite, for hotel staff and shopkeepers.",
    "tts": "Bonjour, madame. Bonjour, monsieur."
   },
   {
    "en": "Good evening",
    "ja": "Bonsoir",
    "ro": "",
    "say": "bohn-SWAHR",
    "when": "From about 6 PM, or once it's dark, in place of bonjour."
   },
   {
    "en": "Thank you",
    "ja": "Merci beaucoup",
    "ro": "",
    "say": "mehr-SEE boh-KOO",
    "when": "Plain “merci” is fine for small things. Say “merci, au revoir” as you leave a shop or get off a bus."
   },
   {
    "en": "Excuse me / Sorry",
    "ja": "Excusez-moi",
    "ro": "",
    "say": "ex-kew-zay-MWAH",
    "when": "Get a stranger's attention or ask them something. To squeeze past someone, a quick “pardon” is enough."
   },
   {
    "en": "I'm sorry",
    "ja": "Je suis désolé(e)",
    "ro": "",
    "say": "zhuh swee day-zoh-LAY",
    "when": "A real apology, for when you bump into someone or make a mistake. Women write désolée; it sounds the same.",
    "tts": "Je suis désolé"
   },
   {
    "en": "Yes / No",
    "ja": "Oui / Non",
    "ro": "",
    "say": "WEE / NOHN",
    "when": "“Non” on its own can sound blunt. “Non, merci” is softer.",
    "tts": "Oui. Non."
   },
   {
    "en": "No thanks, I'm fine",
    "ja": "Non merci, ça va",
    "ro": "",
    "say": "nohn mehr-SEE, sah-VAH",
    "when": "Politely turn down a bag, a receipt, a refill or a flyer. If someone apologises to you, “ce n'est pas grave” means it's no big deal."
   },
   {
    "en": "Please",
    "ja": "S'il vous plaît",
    "ro": "",
    "say": "seel voo PLEH",
    "when": "Add it after whatever you ask for: “un café, s'il vous plaît”. It's also how you call a waiter over, with a raised hand."
   },
   {
    "en": "I don't understand",
    "ja": "Je ne comprends pas",
    "ro": "",
    "say": "zhuh nuh kohm-prahn-PAH",
    "when": "When someone speaks to you in French and you are lost. Start with “pardon” to soften it."
   },
   {
    "en": "Do you speak English?",
    "ja": "Parlez-vous anglais ?",
    "ro": "",
    "say": "par-lay-voo ahn-GLEH",
    "when": "Say bonjour first, then ask in French. People are much happier to switch to English once you've tried."
   },
   {
    "en": "Once more, slowly, please",
    "ja": "Vous pouvez répéter plus lentement, s'il vous plaît ?",
    "ro": "",
    "say": "voo poo-vay ray-pay-TAY plew lahnt-MAHN, seel voo PLEH",
    "when": "When you nearly caught it."
   },
   {
    "en": "Where is the toilet?",
    "ja": "Où sont les toilettes ?",
    "ro": "",
    "say": "oo sohn lay twah-LET",
    "when": "Café toilets are for customers, so buy a coffee first. Paris has free public toilets on many streets; big stations often charge a small fee."
   },
   {
    "en": "Cheers!",
    "ja": "Santé !",
    "ro": "",
    "say": "sahn-TAY",
    "when": "Look each person in the eye as you clink glasses; not doing so is said to bring bad luck."
   }
  ]
 },
 {
  "cat": "Eating out",
  "items": [
   {
    "en": "Four people",
    "ja": "Pour quatre, s'il vous plaît",
    "ro": "",
    "say": "poor KAT-ruh, seel voo PLEH",
    "when": "Wait to be seated in restaurants; at cafés you can usually sit where you like. Many kitchens serve lunch from about noon to 2 PM and dinner from about 7 PM, with nothing in between."
   },
   {
    "en": "Do you have an English menu?",
    "ja": "Vous avez une carte en anglais ?",
    "ro": "",
    "say": "voo-zah-vay ewn KART ahn ahn-GLEH",
    "when": "The full menu is “la carte”; “le menu” means a fixed-price set meal. Places in tourist areas often have English menus."
   },
   {
    "en": "This one, please",
    "ja": "Je vais prendre ça, s'il vous plaît",
    "ro": "",
    "say": "zhuh vay prahn-druh SAH, seel voo PLEH",
    "when": "Point at the menu, the board or the bakery counter. “Je vais prendre…” (I'll have…) works with any dish."
   },
   {
    "en": "Two of these, please",
    "ja": "Deux comme ça, s'il vous plaît",
    "ro": "",
    "say": "duh kum SAH, seel voo PLEH",
    "when": "Counting: un (1), deux (2), trois (3), quatre (4). The French count on their fingers from the thumb, so a thumb alone means one."
   },
   {
    "en": "I'm vegetarian",
    "ja": "Je suis végétarien(ne)",
    "ro": "",
    "say": "zhuh swee vay-zhay-tah-RYAN (women: vay-zhay-tah-RYEN)",
    "when": "Men say végétarien, women végétarienne. Ham and fish can still turn up, so follow it with the next phrase.",
    "tts": "Je suis végétarien"
   },
   {
    "en": "I don't eat meat or fish",
    "ja": "Je ne mange ni viande ni poisson",
    "ro": "",
    "say": "zhuh nuh mahnzh nee VYAHND nee pwah-SOHN",
    "when": "Clearer than “vegetarian”. Say it when ordering. Ham (jambon) and lardons count as meat for you but are easily missed: they hide in salads, quiches and crêpes."
   },
   {
    "en": "Does this have meat or fish in it?",
    "ja": "Il y a de la viande ou du poisson dedans ?",
    "ro": "",
    "say": "eel-yah duh lah VYAHND oo dew pwah-SOHN duh-DAHN",
    "when": "Point at a dish and ask. “Oui, il y en a” means it does; “non, il n'y en a pas” means it doesn't."
   },
   {
    "en": "Is it made with meat or fish stock?",
    "ja": "C'est fait avec un bouillon de viande ou de poisson ?",
    "ro": "",
    "say": "seh feh ah-vek uhn boo-YOHN duh VYAHND oo duh pwah-SOHN",
    "when": "Soups, risottos and sauces are often made with chicken or beef stock (bouillon or fond), even when the dish looks meat-free. French onion soup is traditionally made with beef stock."
   },
   {
    "en": "Without meat, please",
    "ja": "Sans viande, s'il vous plaît",
    "ro": "",
    "say": "sahn VYAHND, seel voo PLEH",
    "when": "Asks them to leave it out. Swap “viande” for “poisson” (fish) or “jambon” (ham). Some restaurants won't change a dish; cafés and crêperies usually will."
   },
   {
    "en": "Water, please",
    "ja": "Une carafe d'eau, s'il vous plaît",
    "ro": "",
    "say": "ewn kah-rahf DOH, seel voo PLEH",
    "when": "Tap water in a carafe is free in restaurants. Asking just for “de l'eau” may bring a bottle you pay for."
   },
   {
    "en": "It's delicious",
    "ja": "C'est délicieux",
    "ro": "",
    "say": "seh day-lee-SYUH",
    "when": "Say it to the server or the chef. It goes down well at small family-run places."
   },
   {
    "en": "Thank you for the meal",
    "ja": "Merci, c'était excellent !",
    "ro": "",
    "say": "mehr-SEE, say-tay-tek-seh-LAHN",
    "when": "Say it as the plates are cleared, when the server asks “ça a été ?” (was everything OK?), or to the staff as you leave, adding “bonne soirée” in the evening."
   },
   {
    "en": "The bill, please",
    "ja": "L'addition, s'il vous plaît",
    "ro": "",
    "say": "lah-dee-SYOHN, seel voo PLEH",
    "when": "Staff won't bring it until you ask, since lingering is normal. Service is included in the prices; for good service, round up or leave a euro or two."
   },
   {
    "en": "Can I pay by card?",
    "ja": "Je peux payer par carte ?",
    "ro": "",
    "say": "zhuh puh peh-yay par KART",
    "when": "Cards are taken almost everywhere, usually contactless (“sans contact”). Some bakeries, markets and small cafés set a minimum or take cash only."
   },
   {
    "en": "To take away, please",
    "ja": "À emporter, s'il vous plaît",
    "ro": "",
    "say": "ah ahm-por-TAY, seel voo PLEH",
    "when": "Bakeries and cafés ask “sur place ou à emporter ?” (eat in or take away?). Eating in can cost a little more."
   }
  ]
 },
 {
  "cat": "Getting around",
  "items": [
   {
    "en": "Where is Gare de Lyon?",
    "ja": "Où est la gare de Lyon ?",
    "ro": "",
    "say": "oo eh lah gar duh LYOHN",
    "when": "Swap in any place after “Où est…”. “Gare” is a mainline station; a metro station is “station de métro”. Gare de Lyon is in Paris, named for where its trains go."
   },
   {
    "en": "Does this train go to Versailles?",
    "ja": "Est-ce que ce train va à Versailles ?",
    "ro": "",
    "say": "ess-kuh suh TRAN vah ah vehr-SAI",
    "when": "Ask staff or anyone on the platform before you board. Swap in your stop. For the palace, the RER C goes to Versailles Château Rive Gauche."
   },
   {
    "en": "Which platform?",
    "ja": "Le train part de quelle voie ?",
    "ro": "",
    "say": "luh tran par duh kel VWAH",
    "when": "Show your ticket as you ask. At big stations the platform (voie) goes up on the departure board only about 20 minutes before the train leaves."
   },
   {
    "en": "To here, please",
    "ja": "À cette adresse, s'il vous plaît",
    "ro": "",
    "say": "ah set ah-DRESS, seel voo PLEH",
    "when": "For taxis. Show the address or map pin on your phone. Paris taxis must take cards."
   },
   {
    "en": "I'm getting off",
    "ja": "Pardon, je descends",
    "ro": "",
    "say": "par-DOHN, zhuh day-SAHN",
    "when": "On a packed metro or bus, say it as you move to the door. On older metro trains you open the door yourself with the button or lever."
   },
   {
    "en": "Is this seat free?",
    "ja": "Cette place est libre ?",
    "ro": "",
    "say": "set plahss eh LEEBR",
    "when": "For local trains, cafés and shared tables. TGV seats are reserved: your ticket gives the car (voiture) and seat (place)."
   },
   {
    "en": "I'm lost",
    "ja": "Je suis perdu(e)",
    "ro": "",
    "say": "zhuh swee pehr-DEW",
    "when": "Then show where you are trying to go. Women write perdue; it sounds the same.",
    "tts": "Je suis perdu"
   }
  ]
 },
 {
  "cat": "Shopping",
  "items": [
   {
    "en": "How much is this?",
    "ja": "C'est combien ?",
    "ro": "",
    "say": "seh kohm-BYAN",
    "when": "Prices include tax. Haggling isn't usual, except at flea markets (marchés aux puces)."
   },
   {
    "en": "Do you have this?",
    "ja": "Vous avez ça ?",
    "ro": "",
    "say": "voo-zah-vay SAH",
    "when": "Show a photo on your phone. Works well in pharmacies, bookshops and department stores."
   },
   {
    "en": "The tax refund form, please",
    "ja": "Je voudrais le bordereau de détaxe, s'il vous plaît",
    "ro": "",
    "say": "zhuh voo-dreh luh bor-duh-ROH duh day-TAX, seel voo PLEH",
    "when": "Visitors from outside the EU can claim back the VAT when they spend over €100 in one shop on one day; bring your passport. Scan the form at a PABLO machine at the airport as you leave the EU, before you check in your bags."
   },
   {
    "en": "Can I try this on?",
    "ja": "Je peux l'essayer ?",
    "ro": "",
    "say": "zhuh puh leh-seh-YAY",
    "when": "Fitting rooms are “les cabines d'essayage”."
   },
   {
    "en": "Do you have a bigger size?",
    "ja": "Vous l'avez en plus grand ?",
    "ro": "",
    "say": "voo lah-vay ahn plew GRAHN",
    "when": "For smaller, say “plus petit”. French sizes differ from US ones: a US women's 8 is about a French 40."
   },
   {
    "en": "I don't need a bag",
    "ja": "Je n'ai pas besoin de sac",
    "ro": "",
    "say": "zhuh neh pah buh-zwan duh SAK",
    "when": "Shops charge for bags and don't give out thin plastic ones, so carry your own."
   },
   {
    "en": "I'm just looking",
    "ja": "Je regarde, merci",
    "ro": "",
    "say": "zhuh ruh-GARD, mehr-SEE",
    "when": "When staff ask “je peux vous aider ?” (can I help you?) and you want to browse."
   }
  ]
 },
 {
  "cat": "Hotels",
  "items": [
   {
    "en": "Checking in, please",
    "ja": "Bonjour, j'ai une réservation",
    "ro": "",
    "say": "bohn-ZHOOR, zhay ewn ray-zehr-vah-SYOHN",
    "when": "Then give the name it's booked under. Most towns add a small tourist tax (taxe de séjour) per person per night, often paid at the hotel."
   },
   {
    "en": "Can you hold our bags?",
    "ja": "Vous pouvez garder nos bagages ?",
    "ro": "",
    "say": "voo poo-vay gar-DAY noh bah-GAZH",
    "when": "Before check-in time or after checkout. Nearly every hotel will."
   },
   {
    "en": "What's the Wi-Fi password?",
    "ja": "Quel est le code wifi ?",
    "ro": "",
    "say": "kel eh luh kod wee-FEE",
    "when": "Usually on a card in the room or at reception. The French say “wee-fee”."
   }
  ]
 },
 {
  "cat": "Photos & baths",
  "items": [
   {
    "en": "May I take a photo?",
    "ja": "Je peux prendre une photo ?",
    "ro": "",
    "say": "zhuh puh prahn-druh ewn foh-TOH",
    "when": "Ask before photographing people or inside small shops. Most museums allow photos without flash; some exhibitions don't."
   },
   {
    "en": "Could you take our photo?",
    "ja": "Vous pourriez nous prendre en photo ?",
    "ro": "",
    "say": "voo poo-ryay noo prahn-druh ahn foh-TOH",
    "when": "Hand over the phone with the camera already open. At busy sights, choose who to ask rather than accepting a stranger's offer."
   },
   {
    "en": "Are tattoos OK?",
    "ja": "Les tatouages, c'est accepté ?",
    "ro": "",
    "say": "lay tah-too-AHZH, say-tak-sep-TAY",
    "when": "Tattoos are rarely a problem at French pools and spas. Public pools have other rules: men need tight swim trunks (no loose shorts), and many ask for a swim cap (bonnet de bain)."
   },
   {
    "en": "Is this OK?",
    "ja": "C'est autorisé ?",
    "ro": "",
    "say": "say-toh-toh-ree-ZAY",
    "when": "An all-purpose check: is it OK to sit here, to bring this in, to do this? “Je peux ?” (may I?) with a gesture also works."
   }
  ]
 },
 {
  "cat": "Emergencies",
  "items": [
   {
    "en": "Please help me",
    "ja": "Aidez-moi, s'il vous plaît",
    "ro": "",
    "say": "ay-day-MWAH, seel voo PLEH",
    "when": "For real trouble. To shout for help, “Au secours !” (oh suh-KOOR)."
   },
   {
    "en": "I don't feel well",
    "ja": "Je ne me sens pas bien",
    "ro": "",
    "say": "zhuh nuh muh sahn pah BYAN",
    "when": "Pharmacies (a green cross) give advice on minor problems; one in each area stays open at night (pharmacie de garde)."
   },
   {
    "en": "Where is a hospital?",
    "ja": "Où est l'hôpital le plus proche ?",
    "ro": "",
    "say": "oo eh loh-pee-TAL luh plew PROSH",
    "when": "For a pharmacy, say “la pharmacie” in place of “l'hôpital”. The emergency department is “les urgences”."
   },
   {
    "en": "I lost my passport",
    "ja": "J'ai perdu mon passeport",
    "ro": "",
    "say": "zhay pehr-dew mohn pahss-POR",
    "when": "Swap in “mon portefeuille” (wallet) or “mon téléphone”. Report it at a police station (commissariat); the report helps with your embassy and insurance."
   },
   {
    "en": "Please call an ambulance",
    "ja": "Appelez une ambulance, s'il vous plaît",
    "ro": "",
    "say": "ah-play ewn ahm-bew-LAHNSS, seel voo PLEH",
    "when": "Emergency numbers: 112 works anywhere in the EU; in France, 15 is the ambulance (SAMU), 17 the police, 18 the fire service."
   }
  ]
 }
],
};
export default fr;
