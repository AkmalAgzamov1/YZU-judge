// The CPE's official one star list (cpe.cse.nsysu.edu.tw/environment.php#starList).
// Every past CPE has had exactly one problem from it. `asked` holds the dates each
// problem appeared in the past exams on cpe.mcu.edu.tw (52 exams, 2013 to 2026).

export const NEXT_CPE = {
  // Taipei time. Update these after each sitting.
  examDay: "2026-12-08T00:00:00+08:00",
  registrationOpens: "2026-11-24T14:25:00+08:00",
  registrationCloses: "2026-12-04T18:00:00+08:00",
};

export const PAST_EXAM_COUNT = 52;

export interface StarProblem {
  uva: number;
  title: string;
  asked: string[];
}

export const STAR_PROBLEMS: StarProblem[] = [
  { uva: 100, title: "The 3n + 1 problem", asked: ["2025-09-30"] },
  { uva: 118, title: "Mutant Flatworld Explorers", asked: ["2018-03-27", "2021-12-21"] },
  { uva: 272, title: "TeX Quotes", asked: [] },
  { uva: 299, title: "Train Swapping", asked: ["2017-09-26"] },
  { uva: 490, title: "Rotating Sentences", asked: ["2015-10-06"] },
  { uva: 948, title: "Fibonaccimal Base", asked: ["2016-05-24"] },
  { uva: 10008, title: "What's Cryptanalysis?", asked: ["2024-10-15"] },
  { uva: 10019, title: "Funny Encryption Method", asked: [] },
  { uva: 10035, title: "Primary Arithmetic", asked: ["2023-03-21"] },
  { uva: 10038, title: "Jolly Jumpers", asked: ["2017-03-28"] },
  { uva: 10041, title: "Vito's Family", asked: ["2024-04-23"] },
  { uva: 10050, title: "Hartals", asked: ["2020-10-20"] },
  { uva: 10055, title: "Hashmat the Brave Warrior", asked: [] },
  { uva: 10056, title: "What is the Probability?", asked: ["2017-05-23"] },
  { uva: 10057, title: "A mid-summer night's dream", asked: [] },
  { uva: 10062, title: "Tell me the frequencies!", asked: ["2016-03-22"] },
  { uva: 10071, title: "Back to High School Physics", asked: ["2017-12-19"] },
  { uva: 10093, title: "An Easy Problem!", asked: ["2023-10-17"] },
  { uva: 10101, title: "Bangla Numbers", asked: ["2018-12-18"] },
  { uva: 10170, title: "The Hotel with Infinite Rooms", asked: [] },
  { uva: 10189, title: "Minesweeper", asked: ["2020-06-09", "2026-05-26"] },
  { uva: 10190, title: "Divide, But Not Quite Conquer!", asked: ["2013-10-01", "2022-05-24"] },
  { uva: 10193, title: "All You Need Is Love", asked: [] },
  { uva: 10221, title: "Satellites", asked: ["2019-05-28"] },
  { uva: 10222, title: "Decode the Mad man", asked: ["2021-10-19"] },
  { uva: 10226, title: "Hardwood Species", asked: ["2026-03-24"] },
  { uva: 10235, title: "Simply Emirp", asked: ["2013-12-17"] },
  { uva: 10242, title: "Fourth Point!!", asked: ["2016-12-20", "2023-12-12"] },
  { uva: 10252, title: "Common Permutation", asked: ["2026-10-06"] },
  { uva: 10268, title: "498-bis", asked: ["2020-05-26", "2024-12-10"] },
  { uva: 10409, title: "Die Game", asked: ["2014-09-23", "2018-10-02"] },
  { uva: 10415, title: "Eb Alto Saxophone Player", asked: ["2016-10-04", "2020-12-22"] },
  { uva: 10420, title: "List of Conquests", asked: ["2019-03-26"] },
  { uva: 10642, title: "Can You Solve It?", asked: ["2022-03-22"] },
  { uva: 10783, title: "Odd Sum", asked: ["2014-05-27"] },
  { uva: 10812, title: "Beat the Spread!", asked: [] },
  { uva: 10908, title: "Largest Square", asked: ["2015-05-26", "2024-05-21"] },
  { uva: 10922, title: "2 the 9s", asked: ["2015-03-24"] },
  { uva: 10929, title: "You can say 11", asked: [] },
  { uva: 10931, title: "Parity", asked: ["2014-03-25", "2022-12-13"] },
  { uva: 11005, title: "Cheapest Base", asked: ["2014-12-23"] },
  { uva: 11063, title: "B2-Sequence", asked: ["2025-05-20"] },
  { uva: 11150, title: "Cola", asked: [] },
  { uva: 11321, title: "Sort! Sort!! and Sort!!!", asked: ["2018-05-29", "2025-12-09"] },
  { uva: 11332, title: "Summing Digits", asked: ["2015-12-22", "2022-10-18"] },
  { uva: 11349, title: "Symmetric Matrix", asked: ["2019-09-24", "2023-05-23"] },
  { uva: 11417, title: "GCD", asked: ["2019-12-17"] },
  { uva: 11461, title: "Square Numbers", asked: ["2025-03-25"] },
  { uva: 12019, title: "Doom's Day Algorithm", asked: ["2021-03-23"] },
];

export const STAR_UVA_IDS: ReadonlySet<number> = new Set(STAR_PROBLEMS.map((problem) => problem.uva));
