export type PlaceholderIdea = {
  id: string;
  title: string;
  description: string;
  location: string;
  price: string;
  votes: number;
};

export type PlaceholderEvent = {
  id: string;
  ideaTitle: string;
  date: string;
  time: string;
  location: string;
};

export const placeholderIdeas: PlaceholderIdea[] = [
  {
    id: "board-games",
    title: "Wieczór planszówek",
    description: "Spokojne spotkanie z grami, przekąskami i herbatą.",
    location: "Mieszkanie Ani",
    price: "20 zł",
    votes: 8,
  },
  {
    id: "bike-trip",
    title: "Wycieczka rowerowa",
    description: "Krótka trasa za miasto i piknik nad wodą.",
    location: "Start przy parku",
    price: "0 zł",
    votes: 6,
  },
  {
    id: "cinema",
    title: "Kino plenerowe",
    description: "Letni seans pod chmurką z kocami i lemoniadą.",
    location: "Bulwary",
    price: "15 zł",
    votes: 4,
  },
];

export const placeholderEvents: PlaceholderEvent[] = [
  {
    id: "friday-board-games",
    ideaTitle: "Wieczór planszówek",
    date: "Piątek, 17 maja",
    time: "19:00",
    location: "Mieszkanie Ani",
  },
  {
    id: "sunday-bike-trip",
    ideaTitle: "Wycieczka rowerowa",
    date: "Niedziela, 26 maja",
    time: "10:30",
    location: "Start przy parku",
  },
];
