/* Portuguese phrase pack, as said in Portugal (not Brazil). No recorded clips: every phrase
   uses the phone's own pt-PT voice. "ja" holds the Portuguese (the field name is historical). */
import type { PhrasePack } from './types';

const pt: PhrasePack = {
  lang: 'pt',
  speechLang: 'pt-PT',
  name: 'Portuguese',
  intro: 'Portugal swallows unstressed vowels, so “desculpe” comes out as “desh-KOOLP”, and an s at the end of a word or before a consonant sounds like “sh”. “Ão” and “em” are nasal, said through the nose; CAPS show the stressed syllable.',
  dictionary: { label: 'Priberam', url: 'https://dicionario.priberam.org/' },
  groups: [
 {
  "cat": "Basics",
  "items": [
   {
    "en": "Hello",
    "ja": "Olá",
    "ro": "",
    "say": "oh-LAH",
    "when": "Friendly and fine anywhere. Walking into a shop or café, “bom dia” or “boa tarde” is the more usual greeting."
   },
   {
    "en": "Good morning",
    "ja": "Bom dia",
    "ro": "",
    "say": "bong DEE-uh",
    "when": "Until lunch, about 1 PM. Then “boa tarde” (BOH-uh TARD), good afternoon, until dark. Say it to everyone you deal with."
   },
   {
    "en": "Good evening",
    "ja": "Boa noite",
    "ro": "",
    "say": "BOH-uh NOYT",
    "when": "After dark. It is also how you say good night."
   },
   {
    "en": "Thank you",
    "ja": "Obrigado / Obrigada",
    "ro": "",
    "say": "oh-bree-GAH-doo / oh-bree-GAH-duh",
    "when": "It depends on who is speaking: men say obrigado, women say obrigada. “Muito obrigado/a” (MWEEN-too) is thank you very much."
   },
   {
    "en": "Excuse me / Sorry",
    "ja": "Desculpe",
    "ro": "",
    "say": "desh-KOOLP",
    "when": "Get someone's attention or apologise for something small. To squeeze past people, “com licença” (kong lee-SEN-suh) is more usual."
   },
   {
    "en": "I'm sorry",
    "ja": "Peço desculpa",
    "ro": "",
    "say": "PEH-soo desh-KOOL-puh",
    "when": "A real apology, for when you bump into someone or make a mistake."
   },
   {
    "en": "Yes / No",
    "ja": "Sim / Não",
    "ro": "",
    "say": "seeng / nowng",
    "when": "Both are nasal: say them partly through the nose. A plain “não” is fine; add “obrigado/a” to soften it."
   },
   {
    "en": "No thanks, I'm fine",
    "ja": "Não é preciso, obrigado / obrigada",
    "ro": "",
    "say": "nowng eh preh-SEE-zoo, oh-bree-GAH-doo",
    "when": "Literally “no need, thanks”. Politely turn down a bag, a receipt or a flyer. If someone apologises to you, “não faz mal” (nowng fahsh MAHL) means “it's fine”."
   },
   {
    "en": "Please",
    "ja": "Por favor",
    "ro": "",
    "say": "poor fuh-VOR",
    "when": "Add it after whatever you are asking for. You will also hear “se faz favor” (suh fahsh fuh-VOR), the usual way to call a waiter over."
   },
   {
    "en": "I don't understand",
    "ja": "Não percebo",
    "ro": "",
    "say": "nowng per-SEH-boo",
    "when": "The everyday way to say it in Portugal. “Não entendo” is understood too."
   },
   {
    "en": "Do you speak English?",
    "ja": "Fala inglês?",
    "ro": "",
    "say": "FAH-luh eeng-GLAYSH",
    "when": "Many people in Lisbon and Porto, especially younger ones, speak good English. Don't open in Spanish: it isn't the same language and can go down badly."
   },
   {
    "en": "Once more, slowly, please",
    "ja": "Pode repetir mais devagar, por favor?",
    "ro": "",
    "say": "POHD reh-peh-TEER mysh dvuh-GAR, poor fuh-VOR",
    "when": "When you nearly caught it. European Portuguese is spoken fast and drops vowels, so this gets used a lot."
   },
   {
    "en": "Where is the toilet?",
    "ja": "Onde é a casa de banho?",
    "ro": "",
    "say": "OHN-dee eh uh KAH-zuh duh BAHN-yoo",
    "when": "Café toilets are for customers, so buy a coffee first. Doors may say H (homens, men) and S (senhoras, women)."
   },
   {
    "en": "Cheers!",
    "ja": "Saúde!",
    "ro": "",
    "say": "sah-OOD",
    "when": "It means “health”. Look each person in the eye as you clink."
   }
  ]
 },
 {
  "cat": "Eating out",
  "items": [
   {
    "en": "Four people",
    "ja": "Somos quatro",
    "ro": "",
    "say": "SOH-moosh KWAH-troo",
    "when": "Staff ask how many (“quantos são?”). Lunch is from about 1 PM and dinner rarely before 8 PM; many kitchens close in between."
   },
   {
    "en": "Do you have an English menu?",
    "ja": "Tem a ementa em inglês?",
    "ro": "",
    "say": "tayng uh ee-MEN-tuh ayng eeng-GLAYSH",
    "when": "“Ementa” is the menu. A “menu” or “prato do dia” is often a set lunch or the dish of the day, usually good value."
   },
   {
    "en": "This one, please",
    "ja": "Queria isto, por favor",
    "ro": "",
    "say": "kuh-REE-uh EESH-too, poor fuh-VOR",
    "when": "Point at the menu or the counter. “Queria” (I'd like) is the polite way to order in Portugal."
   },
   {
    "en": "Two of these, please",
    "ja": "Dois destes, por favor",
    "ro": "",
    "say": "DOYSH DESH-tush, poor fuh-VOR",
    "when": "Counting: um/uma (1), dois/duas (2), três (3), quatro (4). Use “duas destas” for something feminine, like “bica” (an espresso)."
   },
   {
    "en": "I'm vegetarian",
    "ja": "Sou vegetariano / vegetariana",
    "ro": "",
    "say": "soh vuh-zhuh-tuh-ree-AH-noo / vuh-zhuh-tuh-ree-AH-nuh",
    "when": "Men say vegetariano, women vegetariana. Easy in Lisbon and Porto, harder in traditional tascas, where fish may not count as meat. Follow it with the next phrase."
   },
   {
    "en": "I don't eat meat or fish",
    "ja": "Não como carne nem peixe",
    "ro": "",
    "say": "nowng KOH-moo KARN nayng PAYSH",
    "when": "Clearer than “vegetarian”. Say it when ordering: ham (presunto, fiambre) and chouriço turn up in soups, greens and sandwiches."
   },
   {
    "en": "Does this have meat or fish in it?",
    "ja": "Isto leva carne ou peixe?",
    "ro": "",
    "say": "EESH-too LEH-vuh KARN oh PAYSH",
    "when": "Point at a dish and ask. “Leva” means it does; “não leva” means it doesn't."
   },
   {
    "en": "Is it made with meat or fish stock?",
    "ja": "É feito com caldo de carne ou de peixe?",
    "ro": "",
    "say": "eh FAY-too kong KAHL-doo duh KARN oh duh PAYSH",
    "when": "Vegetable soups, rice dishes and beans can be cooked in meat stock or with a piece of chouriço or bacon. Caldo verde usually comes with a slice of chouriço on top."
   },
   {
    "en": "Without meat, please",
    "ja": "Sem carne, por favor",
    "ro": "",
    "say": "sayng KARN, poor fuh-VOR",
    "when": "Asks them to leave it out. Swap “carne” for “peixe” (fish) or “presunto” (ham)."
   },
   {
    "en": "Water, please",
    "ja": "Uma água, por favor",
    "ro": "",
    "say": "OO-muh AH-gwuh, poor fuh-VOR",
    "when": "Water comes bottled and is charged. You'll be asked “fresca ou natural?”: cold or room temperature. “Com gás” is sparkling."
   },
   {
    "en": "It's delicious",
    "ja": "Está delicioso",
    "ro": "",
    "say": "shtah duh-lee-see-OH-zoo",
    "when": "Say it to the server or cook. “Está muito bom” (very good) works just as well."
   },
   {
    "en": "Thank you, everything was great",
    "ja": "Obrigado, estava tudo ótimo",
    "ro": "",
    "say": "oh-bree-GAH-doo, shtah-vuh TOO-doo OH-tee-moo",
    "when": "Say it to the staff as you leave. Women say obrigada."
   },
   {
    "en": "The bill, please",
    "ja": "A conta, por favor",
    "ro": "",
    "say": "uh KOHN-tuh, poor fuh-VOR",
    "when": "It won't come until you ask. Bread, olives or cheese put on the table unasked are charged if you eat them; send them back if you don't want them. Tipping is optional: round up or leave 5 to 10% for good service."
   },
   {
    "en": "Can I pay by card?",
    "ja": "Posso pagar com cartão?",
    "ro": "",
    "say": "POH-soo puh-GAR kong kur-TOWNG",
    "when": "Cards are widely taken, but small cafés and tascas can be cash only or have a minimum. Cash machines say Multibanco."
   },
   {
    "en": "To take away, please",
    "ja": "É para levar, por favor",
    "ro": "",
    "say": "eh PAH-ruh luh-VAR, poor fuh-VOR",
    "when": "At cafés and counters they ask “para comer aqui ou para levar?”: eating in or taking away. Standing at the counter is often cheaper than a table."
   }
  ]
 },
 {
  "cat": "Getting around",
  "items": [
   {
    "en": "Where is Rossio station?",
    "ja": "Onde é a estação do Rossio?",
    "ro": "",
    "say": "OHN-dee eh uh shtuh-SOWNG doo roo-SEE-oo",
    "when": "Swap in any place after “onde é”. Rossio, in central Lisbon, is where trains to Sintra leave from; long-distance trains use Santa Apolónia or Oriente."
   },
   {
    "en": "Does this train go to Sintra?",
    "ja": "Este comboio vai para Sintra?",
    "ro": "",
    "say": "ESHT kong-BOY-oo vy PAH-ruh SEEN-truh",
    "when": "Ask staff or anyone on the platform before you board. In Portugal a train is a “comboio” (Brazilians say “trem”)."
   },
   {
    "en": "Which platform?",
    "ja": "Qual é a linha?",
    "ro": "",
    "say": "kwahl eh uh LEEN-yuh",
    "when": "Departure boards show the platform as “Linha”. Show your ticket or the place on your phone as you ask."
   },
   {
    "en": "To here, please",
    "ja": "Para aqui, por favor",
    "ro": "",
    "say": "PAH-ruh uh-KEE, poor fuh-VOR",
    "when": "For taxis. Show the address or map pin on your phone. Uber and Bolt are common in Lisbon and Porto."
   },
   {
    "en": "I'm getting off",
    "ja": "Com licença, vou sair",
    "ro": "",
    "say": "kong lee-SEN-suh, voh suh-EER",
    "when": "On a packed tram, bus or metro. People may ask you “vai sair?”: are you getting off? On buses, press the button for the next stop (“próxima paragem”)."
   },
   {
    "en": "Is this seat free?",
    "ja": "Este lugar está livre?",
    "ro": "",
    "say": "ESHT loo-GAR shtah LEE-vruh",
    "when": "For trains without seat numbers and busy café terraces."
   },
   {
    "en": "I'm lost",
    "ja": "Estou perdido / perdida",
    "ro": "",
    "say": "shtoh per-DEE-doo / per-DEE-duh",
    "when": "Men say perdido, women perdida. Then show where you are trying to go on your phone."
   }
  ]
 },
 {
  "cat": "Shopping",
  "items": [
   {
    "en": "How much is this?",
    "ja": "Quanto custa?",
    "ro": "",
    "say": "KWAHN-too KOOSH-tuh",
    "when": "Shops have fixed prices. At flea markets like Lisbon's Feira da Ladra, a little haggling is fine."
   },
   {
    "en": "Do you have this?",
    "ja": "Tem isto?",
    "ro": "",
    "say": "tayng EESH-too",
    "when": "Show a photo on your phone."
   },
   {
    "en": "The tax refund form, please",
    "ja": "Queria o formulário de reembolso do IVA, por favor",
    "ro": "",
    "say": "kuh-REE-uh oo for-moo-LAH-ree-oo duh ree-eng-BOHL-soo doo EE-vuh, poor fuh-VOR",
    "when": "IVA is VAT. Only for visitors from outside the EU, spending over about €61 in one shop on one day; bring your passport. Have the form checked at the airport's tax-free kiosk before you check your bags."
   },
   {
    "en": "Can I try this on?",
    "ja": "Posso experimentar?",
    "ro": "",
    "say": "POH-soo shpuh-ree-men-TAR",
    "when": "The fitting room is the “provador”."
   },
   {
    "en": "Do you have a bigger size?",
    "ja": "Tem um tamanho maior?",
    "ro": "",
    "say": "tayng oong tuh-MAHN-yoo my-OR",
    "when": "Sizes are European. For smaller, say “mais pequeno” (mysh puh-KAY-noo) in place of “maior”."
   },
   {
    "en": "I don't need a bag",
    "ja": "Não preciso de saco",
    "ro": "",
    "say": "nowng preh-SEE-zoo duh SAH-koo",
    "when": "Cashiers ask “quer saco?”: do you want a bag? Bags cost a few cents."
   },
   {
    "en": "I'm just looking",
    "ja": "Estou só a ver",
    "ro": "",
    "say": "shtoh SAW uh VEHR",
    "when": "If staff come over to help and you want to browse. “Obrigado/a” after it keeps it friendly."
   }
  ]
 },
 {
  "cat": "Hotels",
  "items": [
   {
    "en": "Checking in, please",
    "ja": "Queria fazer o check-in, por favor",
    "ro": "",
    "say": "kuh-REE-uh fuh-ZEHR oo check-in, poor fuh-VOR",
    "when": "Have passports ready; hotels must register foreign guests. Lisbon and Porto add a small tourist tax per person per night, often paid at the desk."
   },
   {
    "en": "Can you hold our bags?",
    "ja": "Pode guardar as nossas malas?",
    "ro": "",
    "say": "POHD gwar-DAR ush NOH-sush MAH-lush",
    "when": "Before check-in time or after checkout. Nearly every hotel will."
   },
   {
    "en": "What's the Wi-Fi password?",
    "ja": "Qual é a palavra-passe do Wi-Fi?",
    "ro": "",
    "say": "kwahl eh uh puh-LAH-vruh PAHSS doo wai-FAI",
    "when": "“Palavra-passe” is the Portuguese word; “password” is understood too. Often on a card in the room."
   }
  ]
 },
 {
  "cat": "Photos & baths",
  "items": [
   {
    "en": "May I take a photo?",
    "ja": "Posso tirar uma fotografia?",
    "ro": "",
    "say": "POH-soo tee-RAR OO-muh foo-too-gruh-FEE-uh",
    "when": "Ask before photographing people, and in churches during a service. Some museums and shops don't allow it."
   },
   {
    "en": "Could you take our photo?",
    "ja": "Pode tirar-nos uma fotografia?",
    "ro": "",
    "say": "POHD tee-RAR-noosh OO-muh foo-too-gruh-FEE-uh",
    "when": "Hand over the phone with the camera already open."
   },
   {
    "en": "Do I need a swimming cap?",
    "ja": "É preciso touca?",
    "ro": "",
    "say": "eh preh-SEE-zoo TOH-kuh",
    "when": "Ask at pools and spas before paying. Public pools and many hotel spas insist on a cap and some sell them at the desk. Tattoos are no problem."
   },
   {
    "en": "Is this OK?",
    "ja": "Pode ser?",
    "ro": "",
    "say": "POHD SEHR",
    "when": "An all-purpose check: is it OK to sit here, to bring this in, to do this? “Posso?” (POH-soo), may I?, works too."
   }
  ]
 },
 {
  "cat": "Emergencies",
  "items": [
   {
    "en": "Please help me",
    "ja": "Ajude-me, por favor",
    "ro": "",
    "say": "uh-ZHOOD-muh, poor fuh-VOR",
    "when": "For real trouble. In an emergency, shout “Socorro!” (soo-KOH-roo), help!"
   },
   {
    "en": "I don't feel well",
    "ja": "Não me sinto bem",
    "ro": "",
    "say": "nowng muh SEEN-too bayng",
    "when": "Tell hotel staff. SNS 24 (808 24 24 24) is the national health line and can help in English."
   },
   {
    "en": "Where is a hospital?",
    "ja": "Onde é o hospital?",
    "ro": "",
    "say": "OHN-dee eh oo ohsh-pee-TAHL",
    "when": "For a pharmacy, say “farmácia” (fur-MAH-see-uh). Pharmacists give good advice for small things, and each closed pharmacy posts which one is open late (“farmácia de serviço”)."
   },
   {
    "en": "I lost my passport",
    "ja": "Perdi o passaporte",
    "ro": "",
    "say": "per-DEE oo pah-suh-PORT",
    "when": "Swap in “a carteira” (wallet) or “o telemóvel” (phone). Report it at a police station (PSP) to get a report, then contact your embassy."
   },
   {
    "en": "Please call an ambulance",
    "ja": "Chame uma ambulância, por favor",
    "ro": "",
    "say": "SHAHM OO-muh ahm-boo-LAHN-see-uh, poor fuh-VOR",
    "when": "Emergency number: 112 for ambulance, fire and police."
   }
  ]
 }
],
};
export default pt;
