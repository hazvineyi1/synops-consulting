import type { DemoItem, DemoLevel, DemoSkill } from "./demoBank";

// Rise (Adaptive Learning Platform) ships a per-level item bank. Unlike the
// public demo's single unified track, Rise is level-aware: the learner picks a
// band and the adaptive engine draws from that band's items, spanning all four
// reading skills across the difficulty range.

export const RISE_LEVELS: DemoLevel[] = ["elementary", "secondary", "higher"];

export const RISE_LEVEL_LABELS: Record<DemoLevel, string> = {
  elementary: "Elementary (Grades 3 to 5)",
  secondary: "Secondary (Grades 6 to 12)",
  higher: "Higher Education",
};

export const RISE_SKILLS: DemoSkill[] = [
  "Main idea",
  "Inference",
  "Vocabulary in context",
  "Evaluate argument",
];

const RISE_BANK: DemoItem[] = [
  // ── Elementary (Grades 3 to 5) ─────────────────────────────────
  {
    id: "el-mi-1",
    level: "elementary",
    difficulty: 1,
    skill: "Main idea",
    passage:
      "Maria planted seeds in the spring. By summer her garden was full of tomatoes and beans, and she shared them with her neighbors.",
    question: "What is the passage mostly about?",
    options: [
      "Maria growing a garden and sharing the food",
      "How to cook a pot of beans",
      "A long trip to the grocery store",
      "Maria's favorite color",
    ],
    correctIndex: 0,
    hint: "Think about what Maria did from spring to summer.",
  },
  {
    id: "el-vo-1",
    level: "elementary",
    difficulty: 1,
    skill: "Vocabulary in context",
    passage: "The puppy was tiny, so small that it could sit in one hand.",
    question: 'As used here, the word "tiny" most nearly means',
    options: ["very small", "very loud", "very old", "very fast"],
    correctIndex: 0,
    hint: "It could sit in one hand.",
  },
  {
    id: "el-in-1",
    level: "elementary",
    difficulty: 2,
    skill: "Inference",
    passage: "Sam put on his raincoat and grabbed an umbrella before he left for school.",
    question: "What can you infer about the weather?",
    options: ["Rain is likely", "It is snowing hard", "It is hot and dry", "It is the middle of the night"],
    correctIndex: 0,
    hint: "Why would Sam bring a raincoat and an umbrella?",
  },
  {
    id: "el-mi-2",
    level: "elementary",
    difficulty: 2,
    skill: "Main idea",
    passage:
      "For two weeks the class collected canned food. They gave every can to a shelter that helps families in need.",
    question: "The main idea is that the class",
    options: [
      "helped families by collecting food",
      "went on a field trip",
      "learned how to paint",
      "planted new trees",
    ],
    correctIndex: 0,
    hint: "What did the class do with the cans they collected?",
  },
  {
    id: "el-vo-2",
    level: "elementary",
    difficulty: 2,
    skill: "Vocabulary in context",
    passage: "After running all day, the dog was weary and fell asleep the moment it lay down.",
    question: 'As used here, "weary" most nearly means',
    options: ["tired", "happy", "hungry", "afraid"],
    correctIndex: 0,
    hint: "The dog fell asleep right away after running.",
  },
  {
    id: "el-in-2",
    level: "elementary",
    difficulty: 3,
    skill: "Inference",
    passage: "When Liam saw his test, he smiled wide and called his mom right away.",
    question: "What can you infer?",
    options: [
      "He did well on the test",
      "He failed the test",
      "He lost the test",
      "He was bored by the test",
    ],
    correctIndex: 0,
    hint: "A wide smile and a quick call to mom suggest what?",
  },
  {
    id: "el-mi-3",
    level: "elementary",
    difficulty: 3,
    skill: "Main idea",
    passage:
      "Bees move from flower to flower to drink nectar. As they go, they help the plants make new seeds and fruit.",
    question: "What is the passage mostly about?",
    options: [
      "How bees help plants grow",
      "Why bees sometimes sting",
      "How to make honey at home",
      "The many colors of flowers",
    ],
    correctIndex: 0,
    hint: "Focus on what the bees do for the plants.",
  },
  {
    id: "el-ar-1",
    level: "elementary",
    difficulty: 3,
    skill: "Evaluate argument",
    passage:
      "Ben says recess should be longer so students are happier. A teacher adds that test scores often rise when students get more active breaks.",
    question: "Which point best supports Ben's idea?",
    options: [
      "More active breaks can raise test scores",
      "Recess happens outside",
      "Ben likes to play tag",
      "Lunch is served at noon",
    ],
    correctIndex: 0,
    hint: "Which fact gives a strong reason for a longer recess?",
  },
  {
    id: "el-in-3",
    level: "elementary",
    difficulty: 4,
    skill: "Inference",
    passage:
      "The streets were empty, the shops were dark, and a sign on one door read, See you next year.",
    question: "What can you infer?",
    options: [
      "A holiday closing has begun",
      "It is the busiest shopping day",
      "A brand new store just opened",
      "It is the morning rush hour",
    ],
    correctIndex: 0,
    hint: "Empty streets and a See you next year sign point to what?",
  },
  {
    id: "el-ar-2",
    level: "elementary",
    difficulty: 4,
    skill: "Evaluate argument",
    passage:
      "An ad says a cereal makes children run faster and shows a quick runner who eats it. The runner also practices every single day.",
    question: "Which fact most weakens the ad's claim?",
    options: [
      "The runner practices every day",
      "The cereal tastes sweet",
      "The box has bright colors",
      "The ad plays on television",
    ],
    correctIndex: 0,
    hint: "Could something other than the cereal explain the speed?",
  },

  // ── Secondary (Grades 6 to 12) ─────────────────────────────────
  {
    id: "se-mi-1",
    level: "secondary",
    difficulty: 2,
    skill: "Main idea",
    passage:
      "The town swapped its old streetlights for motion-sensing LEDs. Energy bills fell by a third, and residents said the sidewalks felt brighter and safer.",
    question: "The main idea is that the new lights",
    options: [
      "cut costs while improving safety",
      "were very hard to install",
      "made the town feel darker",
      "were unpopular with residents",
    ],
    correctIndex: 0,
    hint: "Note both the lower bills and the safety report.",
  },
  {
    id: "se-vo-1",
    level: "secondary",
    difficulty: 2,
    skill: "Vocabulary in context",
    passage:
      "Despite the chaos backstage, the director stayed composed and calmly guided each actor to the right spot.",
    question: 'As used here, "composed" most nearly means',
    options: ["calm and in control", "confused", "furious", "exhausted"],
    correctIndex: 0,
    hint: "Contrast the word with the chaos around the director.",
  },
  {
    id: "se-in-1",
    level: "secondary",
    difficulty: 3,
    skill: "Inference",
    passage:
      "He brought back the brand new jacket with the tags still attached and asked only about the refund policy.",
    question: "What can you infer?",
    options: [
      "He decided not to keep the jacket",
      "He had worn the jacket often",
      "He wanted a smaller size",
      "He works at the store",
    ],
    correctIndex: 0,
    hint: "Tags still on, asking about refunds. What does that suggest?",
  },
  {
    id: "se-mi-2",
    level: "secondary",
    difficulty: 3,
    skill: "Main idea",
    passage:
      "Rather than add new features, the app team removed three menus almost no one used. Support tickets dropped and daily use climbed.",
    question: "The passage suggests that",
    options: [
      "simplifying the app improved it",
      "more features are always better",
      "the team had run out of ideas",
      "users disliked the change",
    ],
    correctIndex: 0,
    hint: "What happened after the team removed the menus?",
  },
  {
    id: "se-vo-2",
    level: "secondary",
    difficulty: 3,
    skill: "Vocabulary in context",
    passage: "The evidence was scant, so the jury hesitated to convict on so little.",
    question: 'As used here, "scant" most nearly means',
    options: ["barely enough", "overwhelming", "false", "expensive"],
    correctIndex: 0,
    hint: "The jury hesitated because there was so little of it.",
  },
  {
    id: "se-in-2",
    level: "secondary",
    difficulty: 4,
    skill: "Inference",
    passage:
      "By the third week of February the gym was quiet again, the January crowds gone and the regulars back to their usual routines.",
    question: "What can you infer?",
    options: [
      "New-year motivation faded for many people",
      "The gym had closed for good",
      "Memberships had become free",
      "The regular members had quit",
    ],
    correctIndex: 0,
    hint: "The January crowds are gone, but the regulars remain.",
  },
  {
    id: "se-ar-1",
    level: "secondary",
    difficulty: 4,
    skill: "Evaluate argument",
    passage:
      "A columnist claims new bike lanes cut downtown traffic, pointing to fewer jams. That same year the city sharply raised parking fees.",
    question: "Which point most weakens the claim?",
    options: [
      "Higher parking fees could explain the lighter traffic",
      "The bike lanes are painted green",
      "Some cyclists ride quickly",
      "Downtown has tall buildings",
    ],
    correctIndex: 0,
    hint: "Is there another cause for the drop in traffic?",
  },
  {
    id: "se-mi-3",
    level: "secondary",
    difficulty: 4,
    skill: "Main idea",
    passage:
      "The study runs sixty pages, but the finding is plain: students who slept more scored higher, no matter how many hours they studied.",
    question: "The main idea is that",
    options: [
      "more sleep was linked to higher scores",
      "longer studies are always better",
      "study hours never changed",
      "the study was simply too long",
    ],
    correctIndex: 0,
    hint: "Look past the length to the actual finding.",
  },
  {
    id: "se-ar-2",
    level: "secondary",
    difficulty: 5,
    skill: "Evaluate argument",
    passage:
      "A report concludes a wellness program cut sick days. Only employees who already exercised regularly chose to enroll in it.",
    question: "Which flaw most undermines the conclusion?",
    options: [
      "Self-selected, already-healthy enrollees may explain the result",
      "The program had a colorful logo",
      "Sick days are hard to count",
      "The report was published online",
    ],
    correctIndex: 0,
    hint: "Who chose to join, and were they already healthier?",
  },
  {
    id: "se-vo-3",
    level: "secondary",
    difficulty: 5,
    skill: "Vocabulary in context",
    passage:
      "Her praise was so equivocal that no one in the room could tell whether she approved or objected.",
    question: 'As used here, "equivocal" most nearly means',
    options: ["ambiguous", "enthusiastic", "brief", "honest"],
    correctIndex: 0,
    hint: "No one could tell her true position.",
  },

  // ── Higher Education ───────────────────────────────────────────
  {
    id: "hi-mi-1",
    level: "higher",
    difficulty: 3,
    skill: "Main idea",
    passage:
      "The paper surveys decades of urban policy, yet its thesis is narrow: zoning reform, more than subsidies, governs how much housing actually gets built.",
    question: "The central claim is that",
    options: [
      "zoning reform shapes housing supply more than subsidies do",
      "subsidies are the main lever for housing",
      "urban policy is too complex to study",
      "housing supply is essentially fixed",
    ],
    correctIndex: 0,
    hint: "Identify what the authors privilege over subsidies.",
  },
  {
    id: "hi-vo-1",
    level: "higher",
    difficulty: 3,
    skill: "Vocabulary in context",
    passage:
      "The committee's reforms proved salutary, improving both the transparency of decisions and public trust in them.",
    question: 'As used here, "salutary" most nearly means',
    options: ["beneficial", "harmful", "temporary", "costly"],
    correctIndex: 0,
    hint: "The reforms improved transparency and trust.",
  },
  {
    id: "hi-in-1",
    level: "higher",
    difficulty: 3,
    skill: "Inference",
    passage:
      "The author concedes that the data are observational and repeatedly cautions readers against inferring cause from the correlations.",
    question: "What can you infer about the author's stance?",
    options: [
      "They are careful about making causal claims",
      "They are certain the relationship is causal",
      "They reject the data entirely",
      "They ignore the study's limitations",
    ],
    correctIndex: 0,
    hint: "Why would the author caution against inferring cause?",
  },
  {
    id: "hi-mi-2",
    level: "higher",
    difficulty: 4,
    skill: "Main idea",
    passage:
      "While acknowledging real gains in efficiency, the essay argues that automation's deeper effect falls on the distribution of work rather than its total amount.",
    question: "The essay mainly contends that automation",
    options: [
      "reshapes who does the work more than how much exists",
      "will eliminate nearly all jobs",
      "has no measurable effect at all",
      "only ever improves efficiency",
    ],
    correctIndex: 0,
    hint: "Distribution versus total amount is the key contrast.",
  },
  {
    id: "hi-vo-2",
    level: "higher",
    difficulty: 4,
    skill: "Vocabulary in context",
    passage:
      "The results were presented as definitive, yet the methods section reveals a far more tentative basis for the conclusions.",
    question: 'As used here, "tentative" most nearly means',
    options: ["provisional and uncertain", "aggressive", "final", "fraudulent"],
    correctIndex: 0,
    hint: "It is contrasted with the word definitive.",
  },
  {
    id: "hi-in-2",
    level: "higher",
    difficulty: 4,
    skill: "Inference",
    passage:
      "The lab released its raw data, preregistered its hypotheses, and openly invited other groups to replicate the work.",
    question: "What can you infer about the lab's approach?",
    options: [
      "It values transparency and reproducibility",
      "It tries to hide its methods",
      "It is opposed to peer review",
      "It fabricated its results",
    ],
    correctIndex: 0,
    hint: "Open data and preregistration signal what value?",
  },
  {
    id: "hi-ar-1",
    level: "higher",
    difficulty: 4,
    skill: "Evaluate argument",
    passage:
      "An author argues a tax cut caused the growth that followed it. A worldwide commodity boom happened during the very same period.",
    question: "Which point most weakens the causal claim?",
    options: [
      "A concurrent commodity boom could explain the growth",
      "GDP figures are widely reported",
      "The tax cut was politically popular",
      "Growth is generally considered good",
    ],
    correctIndex: 0,
    hint: "Look for a confounding cause acting at the same time.",
  },
  {
    id: "hi-mi-3",
    level: "higher",
    difficulty: 5,
    skill: "Main idea",
    passage:
      "The treatise resists easy summary, but its through-line is that institutions endure less by their formal design than by the habits they cultivate in citizens.",
    question: "The through-line of the treatise is that institutions persist mainly through",
    options: [
      "the habits they cultivate in citizens",
      "their formal design alone",
      "economic incentives only",
      "sheer random chance",
    ],
    correctIndex: 0,
    hint: "Formal design versus cultivated habits is the contrast.",
  },
  {
    id: "hi-ar-2",
    level: "higher",
    difficulty: 5,
    skill: "Evaluate argument",
    passage:
      "A meta-analysis reports a strong effect, but most of the trials it pooled were small, unblinded, and funded by the product's manufacturer.",
    question: "Which observation most undermines the reported effect?",
    options: [
      "Small, unblinded, industry-funded trials invite bias",
      "Meta-analyses combine many studies",
      "The effect was described as strong",
      "The trials were fairly recent",
    ],
    correctIndex: 0,
    hint: "What about the pooled trials threatens their validity?",
  },
  {
    id: "hi-vo-3",
    level: "higher",
    difficulty: 5,
    skill: "Vocabulary in context",
    passage:
      "The prose is so prolix that a single argument sprawls across twenty dense pages.",
    question: 'As used here, "prolix" most nearly means',
    options: ["tediously wordy", "concise", "poetic", "precise"],
    correctIndex: 0,
    hint: "One argument sprawls across twenty pages.",
  },
];

export function riseBankForLevel(level: DemoLevel): DemoItem[] {
  return RISE_BANK.filter((item) => item.level === level).sort(
    (a, b) => a.difficulty - b.difficulty,
  );
}

export function findRiseItem(id: string): DemoItem | undefined {
  return RISE_BANK.find((item) => item.id === id);
}
