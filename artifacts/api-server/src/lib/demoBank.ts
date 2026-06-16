export type DemoLevel = "elementary" | "secondary" | "higher";

export interface DemoItem {
  id: string;
  level: DemoLevel;
  difficulty: number; // 1 (easiest) .. 5 (hardest)
  skill: "Main idea" | "Inference" | "Vocabulary in context" | "Evaluate argument";
  passage: string;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
}

export const DEMO_LEVELS: DemoLevel[] = ["elementary", "secondary", "higher"];

export const DEMO_LEVEL_LABELS: Record<DemoLevel, string> = {
  elementary: "Elementary",
  secondary: "Secondary",
  higher: "Higher Education",
};

/**
 * A self-contained, rules-based item bank. Passages are original and
 * institution-agnostic so the adaptive demo works with no external API keys.
 */
const BANK: DemoItem[] = [
  // ── Elementary ─────────────────────────────────────────────
  {
    id: "el-1",
    level: "elementary",
    difficulty: 1,
    skill: "Main idea",
    passage:
      "Maya kept a small garden behind her house. Every morning she watered the tomatoes and pulled the weeds. By summer, the plants were taller than she was.",
    question: "What is this passage mostly about?",
    options: [
      "A girl taking care of her garden",
      "How to cook tomatoes",
      "A trip to the beach",
      "A rainy day indoors",
    ],
    correctIndex: 0,
    hint: "Look at what Maya does again and again in the passage.",
  },
  {
    id: "el-2",
    level: "elementary",
    difficulty: 2,
    skill: "Main idea",
    passage:
      "Penguins cannot fly, but they are excellent swimmers. Their wings work like flippers, pushing them quickly through the cold water as they chase fish.",
    question: "The passage explains that a penguin's wings are best used for —",
    options: ["flying high", "swimming fast", "keeping warm", "building nests"],
    correctIndex: 1,
    hint: "Find the sentence that says what the wings do in the water.",
  },
  {
    id: "el-3",
    level: "elementary",
    difficulty: 3,
    skill: "Inference",
    passage:
      "When Sam opened the front door, he grabbed his umbrella and pulled on his boots before stepping outside. He frowned at the gray sky.",
    question: "What can you tell about the weather?",
    options: ["It is sunny", "It is snowing", "It is likely raining", "It is very hot"],
    correctIndex: 2,
    hint: "Think about why someone grabs an umbrella and boots.",
  },
  {
    id: "el-4",
    level: "elementary",
    difficulty: 3,
    skill: "Vocabulary in context",
    passage:
      "The old bridge was fragile, so the town put up a sign warning trucks to stay off it.",
    question: "In this passage, the word \"fragile\" means —",
    options: ["brand new", "easily broken", "very wide", "brightly painted"],
    correctIndex: 1,
    hint: "Why would trucks be warned to stay off the bridge?",
  },
  {
    id: "el-5",
    level: "elementary",
    difficulty: 4,
    skill: "Inference",
    passage:
      "Leo practiced the piano for an hour every day after school. At the spring concert, the audience clapped loudly when he finished, and his teacher smiled.",
    question: "Why did the audience most likely clap loudly?",
    options: [
      "Leo played well after lots of practice",
      "The concert was over",
      "Leo forgot the song",
      "It was very cold in the room",
    ],
    correctIndex: 0,
    hint: "Connect Leo's daily practice with how people reacted.",
  },
  {
    id: "el-6",
    level: "elementary",
    difficulty: 5,
    skill: "Evaluate argument",
    passage:
      "Ria says her school should add a recycling bin in every classroom. She points out that students throw away hundreds of paper sheets each week that could be reused.",
    question: "Which detail best supports Ria's idea?",
    options: [
      "Recycling bins come in many colors",
      "Hundreds of paper sheets are thrown away weekly",
      "Ria is in the fourth grade",
      "The school has a large playground",
    ],
    correctIndex: 1,
    hint: "Find the reason that directly backs up adding recycling bins.",
  },
  // ── Secondary ──────────────────────────────────────────────
  {
    id: "se-1",
    level: "secondary",
    difficulty: 1,
    skill: "Main idea",
    passage:
      "Coral reefs cover a tiny fraction of the ocean floor, yet they support roughly a quarter of all marine species. Scientists often call them the rainforests of the sea.",
    question: "The main idea of the passage is that coral reefs —",
    options: [
      "are larger than rainforests",
      "support a remarkable amount of ocean life",
      "are found only in cold water",
      "are made entirely of plants",
    ],
    correctIndex: 1,
    hint: "Why might reefs be compared to rainforests?",
  },
  {
    id: "se-2",
    level: "secondary",
    difficulty: 2,
    skill: "Vocabulary in context",
    passage:
      "The committee's plan was ambitious: rather than repairing one library, they aimed to build five new branches across the city within three years.",
    question: "As used here, \"ambitious\" most nearly means —",
    options: ["unrealistic", "bold and far-reaching", "inexpensive", "secret"],
    correctIndex: 1,
    hint: "Consider the scale of what the committee aimed to do.",
  },
  {
    id: "se-3",
    level: "secondary",
    difficulty: 3,
    skill: "Inference",
    passage:
      "By the third week of the drought, the reservoir had dropped to levels not seen in a decade. The city council scheduled an emergency meeting and asked residents to limit watering their lawns.",
    question: "Which conclusion is best supported by the passage?",
    options: [
      "The city expects heavy rain soon",
      "Water supplies had become a serious concern",
      "Residents were forbidden from drinking water",
      "The reservoir was newly built",
    ],
    correctIndex: 1,
    hint: "Why would the council meet and ask people to conserve?",
  },
  {
    id: "se-4",
    level: "secondary",
    difficulty: 4,
    skill: "Evaluate argument",
    passage:
      "A student argues that the school day should start later because teenagers naturally fall asleep and wake up later than adults. She cites sleep studies showing improved focus when start times are pushed back.",
    question: "Which addition would most strengthen her argument?",
    options: [
      "A list of her favorite subjects",
      "Data showing test scores rose at schools with later start times",
      "A note that she dislikes waking up early",
      "A description of the school building",
    ],
    correctIndex: 1,
    hint: "Strong arguments add evidence about results, not personal feelings.",
  },
  {
    id: "se-5",
    level: "secondary",
    difficulty: 5,
    skill: "Evaluate argument",
    passage:
      "An editorial claims that banning phones in classrooms will instantly raise grades. It offers one school where grades rose after a ban, but does not mention that the same school also hired more tutors that year.",
    question: "What is the main weakness in the editorial's reasoning?",
    options: [
      "It uses too many statistics",
      "It ignores another change that could explain the higher grades",
      "It defines the word 'phone' incorrectly",
      "It quotes too many teachers",
    ],
    correctIndex: 1,
    hint: "Could something besides the phone ban have raised grades?",
  },
  // ── Higher Education ───────────────────────────────────────
  {
    id: "hi-1",
    level: "higher",
    difficulty: 1,
    skill: "Main idea",
    passage:
      "Open-source software is distributed with its underlying code freely available. This transparency lets a global community inspect, modify, and improve the software, which can accelerate innovation.",
    question: "The passage primarily emphasizes that open-source software —",
    options: [
      "is always free of bugs",
      "benefits from open, collaborative improvement",
      "cannot be modified by users",
      "is only used by large companies",
    ],
    correctIndex: 1,
    hint: "What advantage does open code create, according to the passage?",
  },
  {
    id: "hi-2",
    level: "higher",
    difficulty: 2,
    skill: "Vocabulary in context",
    passage:
      "The researcher remained skeptical of the bold claim until the experiment had been replicated by three independent labs.",
    question: "As used in the passage, \"skeptical\" most nearly means —",
    options: ["enthusiastic", "doubtful", "confused", "indifferent"],
    correctIndex: 1,
    hint: "How would a careful researcher treat an unproven claim?",
  },
  {
    id: "hi-3",
    level: "higher",
    difficulty: 3,
    skill: "Inference",
    passage:
      "Although the new policy reduced average commute times, surveys showed that worker satisfaction barely changed. Analysts suggested that other factors, such as workload and pay, weighed more heavily on morale.",
    question: "What can be inferred from the passage?",
    options: [
      "Shorter commutes guarantee happier workers",
      "Commute time may be a minor factor in overall satisfaction",
      "The policy increased commute times",
      "Workers were never surveyed",
    ],
    correctIndex: 1,
    hint: "Satisfaction barely changed even though commutes improved — why?",
  },
  {
    id: "hi-4",
    level: "higher",
    difficulty: 4,
    skill: "Evaluate argument",
    passage:
      "A columnist argues that a city should invest heavily in public transit, claiming it will reduce traffic. As support, the columnist notes that cities with strong transit systems tend to report lower congestion.",
    question: "Which question most directly tests the strength of this argument?",
    options: [
      "How long has the columnist lived in the city?",
      "Do those cities differ in ways, besides transit, that also affect congestion?",
      "What is the columnist's favorite mode of travel?",
      "How many readers agreed with the column?",
    ],
    correctIndex: 1,
    hint: "Correlation between transit and low congestion may have other causes.",
  },
  {
    id: "hi-5",
    level: "higher",
    difficulty: 5,
    skill: "Evaluate argument",
    passage:
      "A report concludes that a tutoring program 'caused' a rise in graduation rates. Participation was voluntary, and the students who chose to enroll already had higher attendance than their peers before the program began.",
    question: "Which flaw most undermines the report's causal claim?",
    options: [
      "The sample of students was too cheerful",
      "Self-selection means enrolled students may have differed from the start",
      "Graduation rates are impossible to measure",
      "The program lasted only one semester",
    ],
    correctIndex: 1,
    hint: "If motivated students opted in, can the program alone get the credit?",
  },
];

export function bankForLevel(level: DemoLevel): DemoItem[] {
  return BANK.filter((item) => item.level === level).sort(
    (a, b) => a.difficulty - b.difficulty,
  );
}

export function findItem(id: string): DemoItem | undefined {
  return BANK.find((item) => item.id === id);
}
