# What WrongTrain is for

Read this before designing or building anything. Weigh every feature against it: the planner
and the transit help are the heart of the app.

## Where it came from

A group of seven (later five) planning Japan found no easy tool for it. A hired travel planner
was slow and generic, and didn't listen. So Adam planned it by hand: that became the Japan 2026
page at wrongtrain.lol. The name comes from Adam getting on the wrong train.

## Who it's for

Millennials travelling without kids, who would rather not be around them. Child-free is the
default everywhere, and could be a selling point ("child-free travel"). No family-friendly
options.

## What it should do

- **Just say it, and it lands in the right place.** This is one of the main things about the app.
  Anyone on the trip drops in a simple note, wish or piece of news ("muji, donqui and uniqlo",
  "our flight home is JL 4 at 7:45 PM", the tattoo studio's directions) and WrongTrain spreads it
  through the trip: places, days, travel, to-dos, the map. By default it all goes straight
  through, with no waiting for the owner (Adam decided Oct 16); an owner who wants to approve
  changes can switch that on per trip.
- **Plan it for me, then I'll adjust.** Ask how many people are going, where each starts from,
  rough dates, budget ($ to $$$$$) and tastes. Then propose the split between cities
  (say 4 nights Osaka, 4 Kyoto, 5 Tokyo), hotels, food and sights.
- **Plan around what's on.** Festivals, parades, holidays and concerts on the trip's dates.
  (Adam loved stumbling on a huge street festival in Peru.)
- **A group, but each person their own.** The owner sets the trip up and shares it. Each person
  sets their own budget and tastes; some stay somewhere cheaper near the group's hotel. Everyone
  sees what everyone is doing, and can build their own plans: together some of the time, not
  all of it.
- **Shared timelines.** Couples share a timeline by default, and either can split off, pick
  things from a friend's timeline, or change their own. Leading idea, not decided yet: one
  timeline where each item says who's in it (blank means everyone), pairs default to each
  other, "Join this" on a friend's item, and each night's stay can differ per pair.
- **Two kinds of day, in the same group.** Some people like timed days: what's next, and when.
  Others like to wake up, get coffee, pick a neighbourhood (say Shinjuku) and choose from about
  ten things there as they go. Support both, per person and per day.
- **Help in the moment.** "Hungry, vegetarian, within a 10-minute walk." "Something weird, not
  another history museum." Live music tonight, somewhere to chill and people-watch, a massage.
  "The event's at 5 and it's 2 now: is there time for a nap at the hotel? When do I leave?"
- **Get me home**, with the options (in Tokyo, Uber mostly means taxis).
- **Where are my friends?** Location shared for a while, or for the whole trip, by choice.
- **Transit is the core** (it's in the name). Exactly where to go, including through stations,
  shown visually. Leave-now alerts saying which line to take, or to call a taxi.
- **Light and dark mode.**

## How it makes money (later)

Affiliate and referral links: tours (Viator), hotels, reservations, eSIMs, insurance. Always
labelled. See `app/src/model/partners.ts`.
