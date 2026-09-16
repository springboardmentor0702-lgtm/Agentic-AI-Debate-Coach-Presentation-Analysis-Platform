/**
 * One-time seed script: populates 150 real debate topics —
 * 30 per format (10 Beginner / 10 Intermediate / 10 Hard).
 *
 * Run once from the backend folder:
 *   node seedTopics.js
 *
 * Safe to re-run — it skips any topic whose title already exists,
 * so it won't create duplicates.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Topic = require("./models/Topic");

const TOPICS = [

  // ===== ONE-ON-ONE DEBATE =====
  { format: "One-on-One Debate", difficulty: "Beginner", title: "Homework should be banned in schools" },
  { format: "One-on-One Debate", difficulty: "Beginner", title: "Video games are a waste of time" },
  { format: "One-on-One Debate", difficulty: "Beginner", title: "School uniforms should be mandatory" },
  { format: "One-on-One Debate", difficulty: "Beginner", title: "Social media does more harm than good" },
  { format: "One-on-One Debate", difficulty: "Beginner", title: "Junk food should be banned in schools" },
  { format: "One-on-One Debate", difficulty: "Beginner", title: "Zoos should be abolished" },
  { format: "One-on-One Debate", difficulty: "Beginner", title: "Students should be paid for good grades" },
  { format: "One-on-One Debate", difficulty: "Beginner", title: "Mobile phones should be allowed in classrooms" },
  { format: "One-on-One Debate", difficulty: "Beginner", title: "Television is better than reading books" },
  { format: "One-on-One Debate", difficulty: "Beginner", title: "Every student should learn to code" },

  { format: "One-on-One Debate", difficulty: "Intermediate", title: "Standardized testing should be abolished" },
  { format: "One-on-One Debate", difficulty: "Intermediate", title: "College education should be free for everyone" },
  { format: "One-on-One Debate", difficulty: "Intermediate", title: "Animal testing should be banned" },
  { format: "One-on-One Debate", difficulty: "Intermediate", title: "Universal basic income should be implemented" },
  { format: "One-on-One Debate", difficulty: "Intermediate", title: "Voting should be mandatory for all citizens" },
  { format: "One-on-One Debate", difficulty: "Intermediate", title: "Capital punishment should be abolished worldwide" },
  { format: "One-on-One Debate", difficulty: "Intermediate", title: "Nuclear energy is the best solution to climate change" },
  { format: "One-on-One Debate", difficulty: "Intermediate", title: "Social media platforms should verify user identities" },
  { format: "One-on-One Debate", difficulty: "Intermediate", title: "Remote work is more productive than office work" },
  { format: "One-on-One Debate", difficulty: "Intermediate", title: "Genetically modified food is safe for consumption" },

  { format: "One-on-One Debate", difficulty: "Hard", title: "Artificial intelligence should be granted legal personhood" },
  { format: "One-on-One Debate", difficulty: "Hard", title: "Governments should implement a carbon tax on all industries" },
  { format: "One-on-One Debate", difficulty: "Hard", title: "Universal healthcare should replace private insurance systems" },
  { format: "One-on-One Debate", difficulty: "Hard", title: "Encryption backdoors should be mandated for national security" },
  { format: "One-on-One Debate", difficulty: "Hard", title: "Reparations should be paid for historical injustices" },
  { format: "One-on-One Debate", difficulty: "Hard", title: "Space exploration funding should be redirected to poverty alleviation" },
  { format: "One-on-One Debate", difficulty: "Hard", title: "Autonomous weapons should be banned under international law" },
  { format: "One-on-One Debate", difficulty: "Hard", title: "Gene editing in human embryos should be permitted" },
  { format: "One-on-One Debate", difficulty: "Hard", title: "Central banks should adopt digital currencies over physical cash" },
  { format: "One-on-One Debate", difficulty: "Hard", title: "Global trade should prioritize environmental standards over economic growth" },

  // ===== PARLIAMENTARY DEBATE =====
  { format: "Parliamentary Debate", difficulty: "Beginner", title: "This House believes homework should be optional" },
  { format: "Parliamentary Debate", difficulty: "Beginner", title: "This House would ban single-use plastics" },
  { format: "Parliamentary Debate", difficulty: "Beginner", title: "This House believes sports should be mandatory in schools" },
  { format: "Parliamentary Debate", difficulty: "Beginner", title: "This House would abolish exams in favor of projects" },
  { format: "Parliamentary Debate", difficulty: "Beginner", title: "This House believes pets should have the same rights as humans" },
  { format: "Parliamentary Debate", difficulty: "Beginner", title: "This House would ban advertising aimed at children" },
  { format: "Parliamentary Debate", difficulty: "Beginner", title: "This House believes students should choose their own subjects" },
  { format: "Parliamentary Debate", difficulty: "Beginner", title: "This House would make recycling mandatory for households" },
  { format: "Parliamentary Debate", difficulty: "Beginner", title: "This House believes screen time should be limited for children" },
  { format: "Parliamentary Debate", difficulty: "Beginner", title: "This House would introduce a four-day school week" },

  { format: "Parliamentary Debate", difficulty: "Intermediate", title: "This House would legalize marijuana nationwide" },
  { format: "Parliamentary Debate", difficulty: "Intermediate", title: "This House believes the voting age should be lowered to 16" },
  { format: "Parliamentary Debate", difficulty: "Intermediate", title: "This House would ban private schools" },
  { format: "Parliamentary Debate", difficulty: "Intermediate", title: "This House believes social media companies should be regulated like utilities" },
  { format: "Parliamentary Debate", difficulty: "Intermediate", title: "This House would introduce a universal basic income" },
  { format: "Parliamentary Debate", difficulty: "Intermediate", title: "This House believes tuition fees should be abolished" },
  { format: "Parliamentary Debate", difficulty: "Intermediate", title: "This House would ban gambling advertisements" },
  { format: "Parliamentary Debate", difficulty: "Intermediate", title: "This House believes prisons should focus on rehabilitation over punishment" },
  { format: "Parliamentary Debate", difficulty: "Intermediate", title: "This House would implement a four-day work week nationally" },
  { format: "Parliamentary Debate", difficulty: "Intermediate", title: "This House believes influencers should disclose all paid promotions" },

  { format: "Parliamentary Debate", difficulty: "Hard", title: "This House would abolish the United Nations Security Council veto power" },
  { format: "Parliamentary Debate", difficulty: "Hard", title: "This House believes developed nations should cancel developing nations' debt" },
  { format: "Parliamentary Debate", difficulty: "Hard", title: "This House would implement mandatory national service for young adults" },
  { format: "Parliamentary Debate", difficulty: "Hard", title: "This House believes intellectual property laws hinder innovation" },
  { format: "Parliamentary Debate", difficulty: "Hard", title: "This House would ban lobbying by corporations in politics" },
  { format: "Parliamentary Debate", difficulty: "Hard", title: "This House believes term limits should be imposed on all elected officials" },
  { format: "Parliamentary Debate", difficulty: "Hard", title: "This House would nationalize essential utilities" },
  { format: "Parliamentary Debate", difficulty: "Hard", title: "This House believes the international community should intervene in civil wars" },
  { format: "Parliamentary Debate", difficulty: "Hard", title: "This House would abolish tax havens globally" },
  { format: "Parliamentary Debate", difficulty: "Hard", title: "This House believes AI-generated content should be regulated like journalism" },

  // ===== OXFORD DEBATE =====
  { format: "Oxford Debate", difficulty: "Beginner", title: "This House believes technology makes us less social" },
  { format: "Oxford Debate", difficulty: "Beginner", title: "This House believes fast food should be taxed higher" },
  { format: "Oxford Debate", difficulty: "Beginner", title: "This House believes children should have less homework" },
  { format: "Oxford Debate", difficulty: "Beginner", title: "This House believes libraries are still necessary" },
  { format: "Oxford Debate", difficulty: "Beginner", title: "This House believes competitive sports build better character than cooperative games" },
  { format: "Oxford Debate", difficulty: "Beginner", title: "This House believes online learning is as effective as classroom learning" },
  { format: "Oxford Debate", difficulty: "Beginner", title: "This House believes reality TV negatively influences society" },
  { format: "Oxford Debate", difficulty: "Beginner", title: "This House believes fashion trends waste resources" },
  { format: "Oxford Debate", difficulty: "Beginner", title: "This House believes public transport should be free" },
  { format: "Oxford Debate", difficulty: "Beginner", title: "This House believes cursive writing should still be taught in schools" },

  { format: "Oxford Debate", difficulty: "Intermediate", title: "This House believes globalization has done more harm than good" },
  { format: "Oxford Debate", difficulty: "Intermediate", title: "This House believes celebrities have too much political influence" },
  { format: "Oxford Debate", difficulty: "Intermediate", title: "This House believes advertising manipulates consumer choice unfairly" },
  { format: "Oxford Debate", difficulty: "Intermediate", title: "This House believes the gig economy exploits workers" },
  { format: "Oxford Debate", difficulty: "Intermediate", title: "This House believes traditional media is losing its relevance" },
  { format: "Oxford Debate", difficulty: "Intermediate", title: "This House believes beauty standards perpetuated by media are harmful" },
  { format: "Oxford Debate", difficulty: "Intermediate", title: "This House believes higher education is overrated" },
  { format: "Oxford Debate", difficulty: "Intermediate", title: "This House believes consumerism drives environmental destruction" },
  { format: "Oxford Debate", difficulty: "Intermediate", title: "This House believes cancel culture silences legitimate debate" },
  { format: "Oxford Debate", difficulty: "Intermediate", title: "This House believes automation threatens the future of work" },

  { format: "Oxford Debate", difficulty: "Hard", title: "This House believes Western democracies are in decline" },
  { format: "Oxford Debate", difficulty: "Hard", title: "This House believes international aid perpetuates dependency" },
  { format: "Oxford Debate", difficulty: "Hard", title: "This House believes free markets fail to address inequality" },
  { format: "Oxford Debate", difficulty: "Hard", title: "This House believes the death penalty deters crime" },
  { format: "Oxford Debate", difficulty: "Hard", title: "This House believes religious institutions should pay taxes" },
  { format: "Oxford Debate", difficulty: "Hard", title: "This House believes military intervention is justified to prevent genocide" },
  { format: "Oxford Debate", difficulty: "Hard", title: "This House believes patents on life-saving drugs should be abolished" },
  { format: "Oxford Debate", difficulty: "Hard", title: "This House believes surveillance is a necessary evil in modern society" },
  { format: "Oxford Debate", difficulty: "Hard", title: "This House believes economic sanctions are an effective foreign policy tool" },
  { format: "Oxford Debate", difficulty: "Hard", title: "This House believes AI will create more jobs than it destroys" },

  // ===== POLICY DEBATE =====
  { format: "Policy Debate", difficulty: "Beginner", title: "The government should provide free public Wi-Fi in all cities" },
  { format: "Policy Debate", difficulty: "Beginner", title: "The government should ban plastic bags nationwide" },
  { format: "Policy Debate", difficulty: "Beginner", title: "Schools should provide free meals to all students" },
  { format: "Policy Debate", difficulty: "Beginner", title: "The government should fund more public parks" },
  { format: "Policy Debate", difficulty: "Beginner", title: "Public libraries should extend their operating hours" },
  { format: "Policy Debate", difficulty: "Beginner", title: "The government should subsidize public transportation for students" },
  { format: "Policy Debate", difficulty: "Beginner", title: "Cities should build more bike lanes" },
  { format: "Policy Debate", difficulty: "Beginner", title: "The government should require recycling programs in every city" },
  { format: "Policy Debate", difficulty: "Beginner", title: "Schools should offer free after-school programs" },
  { format: "Policy Debate", difficulty: "Beginner", title: "The government should provide free vaccinations for children" },

  { format: "Policy Debate", difficulty: "Intermediate", title: "The government should implement a minimum wage increase nationwide" },
  { format: "Policy Debate", difficulty: "Intermediate", title: "The government should mandate paid parental leave for all employees" },
  { format: "Policy Debate", difficulty: "Intermediate", title: "The government should regulate social media algorithms for minors" },
  { format: "Policy Debate", difficulty: "Intermediate", title: "The government should invest more in renewable energy infrastructure" },
  { format: "Policy Debate", difficulty: "Intermediate", title: "The government should provide free community college education" },
  { format: "Policy Debate", difficulty: "Intermediate", title: "The government should implement stricter data privacy laws" },
  { format: "Policy Debate", difficulty: "Intermediate", title: "The government should ban single-use plastics nationally" },
  { format: "Policy Debate", difficulty: "Intermediate", title: "The government should increase funding for mental health services" },
  { format: "Policy Debate", difficulty: "Intermediate", title: "The government should implement a four-day work week policy" },
  { format: "Policy Debate", difficulty: "Intermediate", title: "The government should regulate the gig economy with worker protections" },

  { format: "Policy Debate", difficulty: "Hard", title: "The government should implement a universal basic income program" },
  { format: "Policy Debate", difficulty: "Hard", title: "The government should adopt a carbon tax to combat climate change" },
  { format: "Policy Debate", difficulty: "Hard", title: "The government should nationalize the healthcare system" },
  { format: "Policy Debate", difficulty: "Hard", title: "The government should implement stricter regulations on AI development" },
  { format: "Policy Debate", difficulty: "Hard", title: "The government should reform the criminal justice system to prioritize rehabilitation" },
  { format: "Policy Debate", difficulty: "Hard", title: "The government should increase corporate tax rates to fund social programs" },
  { format: "Policy Debate", difficulty: "Hard", title: "The government should implement mandatory national voting" },
  { format: "Policy Debate", difficulty: "Hard", title: "The government should regulate cryptocurrency markets more strictly" },
  { format: "Policy Debate", difficulty: "Hard", title: "The government should invest in space exploration over other priorities" },
  { format: "Policy Debate", difficulty: "Hard", title: "The government should implement a wealth tax on the ultra-rich" },

  // ===== PUBLIC FORUM DEBATE =====
  { format: "Public Forum Debate", difficulty: "Beginner", title: "Should schools ban smartphones during class?" },
  { format: "Public Forum Debate", difficulty: "Beginner", title: "Should students get a say in their school's rules?" },
  { format: "Public Forum Debate", difficulty: "Beginner", title: "Should recess be mandatory for all grade levels?" },
  { format: "Public Forum Debate", difficulty: "Beginner", title: "Should students be required to volunteer in their community?" },
  { format: "Public Forum Debate", difficulty: "Beginner", title: "Should schools teach financial literacy as a core subject?" },
  { format: "Public Forum Debate", difficulty: "Beginner", title: "Should year-round schooling replace the traditional school calendar?" },
  { format: "Public Forum Debate", difficulty: "Beginner", title: "Should schools eliminate grades in favor of feedback-based assessment?" },
  { format: "Public Forum Debate", difficulty: "Beginner", title: "Should physical education be mandatory throughout high school?" },
  { format: "Public Forum Debate", difficulty: "Beginner", title: "Should schools ban junk food from vending machines?" },
  { format: "Public Forum Debate", difficulty: "Beginner", title: "Should students be taught coding starting in elementary school?" },

  { format: "Public Forum Debate", difficulty: "Intermediate", title: "Should the drinking age be lowered to 18?" },
  { format: "Public Forum Debate", difficulty: "Intermediate", title: "Should professional athletes be paid based on performance metrics?" },
  { format: "Public Forum Debate", difficulty: "Intermediate", title: "Should companies be required to disclose AI use in customer service?" },
  { format: "Public Forum Debate", difficulty: "Intermediate", title: "Should streaming services be regulated like traditional broadcasters?" },
  { format: "Public Forum Debate", difficulty: "Intermediate", title: "Should employers be allowed to monitor employees' social media?" },
  { format: "Public Forum Debate", difficulty: "Intermediate", title: "Should countries adopt a shorter work week to boost productivity?" },
  { format: "Public Forum Debate", difficulty: "Intermediate", title: "Should genetically modified crops be more widely adopted?" },
  { format: "Public Forum Debate", difficulty: "Intermediate", title: "Should online privacy be considered a fundamental human right?" },
  { format: "Public Forum Debate", difficulty: "Intermediate", title: "Should news organizations be held responsible for spreading misinformation?" },
  { format: "Public Forum Debate", difficulty: "Intermediate", title: "Should companies be required to offer four-day work weeks?" },

  { format: "Public Forum Debate", difficulty: "Hard", title: "Should wealthy nations bear greater responsibility for climate change mitigation?" },
  { format: "Public Forum Debate", difficulty: "Hard", title: "Should artificial intelligence be used in judicial sentencing decisions?" },
  { format: "Public Forum Debate", difficulty: "Hard", title: "Should countries with nuclear weapons be required to disarm?" },
  { format: "Public Forum Debate", difficulty: "Hard", title: "Should international courts have jurisdiction over war crimes committed by any nation?" },
  { format: "Public Forum Debate", difficulty: "Hard", title: "Should social media companies be held legally liable for user-generated misinformation?" },
  { format: "Public Forum Debate", difficulty: "Hard", title: "Should genetic engineering be permitted to prevent hereditary diseases?" },
  { format: "Public Forum Debate", difficulty: "Hard", title: "Should governments regulate the use of facial recognition technology?" },
  { format: "Public Forum Debate", difficulty: "Hard", title: "Should multinational corporations be taxed based on where profits are generated?" },
  { format: "Public Forum Debate", difficulty: "Hard", title: "Should countries prioritize economic growth over environmental protection in trade policy?" },
  { format: "Public Forum Debate", difficulty: "Hard", title: "Should autonomous vehicles be granted priority lanes in urban infrastructure?" },
  // ===== AI DEBATE SIMULATION =====
  { format: "AI Debate Simulation", difficulty: "Beginner", title: "Should AI chatbots be used to help students with homework?" },
  { format: "AI Debate Simulation", difficulty: "Beginner", title: "Should everyone learn to work alongside AI tools?" },
  { format: "AI Debate Simulation", difficulty: "Beginner", title: "Are AI assistants making people less independent thinkers?" },
  { format: "AI Debate Simulation", difficulty: "Beginner", title: "Should schools teach students how AI works?" },
  { format: "AI Debate Simulation", difficulty: "Beginner", title: "Is it fair to use AI to write essays for school?" },
  { format: "AI Debate Simulation", difficulty: "Beginner", title: "Should robots do household chores for everyone?" },
  { format: "AI Debate Simulation", difficulty: "Beginner", title: "Can AI ever be a true friend to a human?" },
  { format: "AI Debate Simulation", difficulty: "Beginner", title: "Should self-driving cars replace human drivers?" },
  { format: "AI Debate Simulation", difficulty: "Beginner", title: "Is it okay to trust AI for medical advice?" },
  { format: "AI Debate Simulation", difficulty: "Beginner", title: "Should video calls with AI avatars replace real teachers?" },

  { format: "AI Debate Simulation", difficulty: "Intermediate", title: "Should companies be required to disclose when a customer is talking to an AI?" },
  { format: "AI Debate Simulation", difficulty: "Intermediate", title: "Can AI truly understand human emotions?" },
  { format: "AI Debate Simulation", difficulty: "Intermediate", title: "Should AI-generated art be eligible for awards?" },
  { format: "AI Debate Simulation", difficulty: "Intermediate", title: "Should social media feeds be curated entirely by AI?" },
  { format: "AI Debate Simulation", difficulty: "Intermediate", title: "Should AI be allowed to make hiring decisions?" },
  { format: "AI Debate Simulation", difficulty: "Intermediate", title: "Is AI more objective than humans in decision-making?" },
  { format: "AI Debate Simulation", difficulty: "Intermediate", title: "Should AI companions be used to combat loneliness?" },
  { format: "AI Debate Simulation", difficulty: "Intermediate", title: "Should AI be used to grade student assignments?" },
  { format: "AI Debate Simulation", difficulty: "Intermediate", title: "Can AI replace human customer service entirely?" },
  { format: "AI Debate Simulation", difficulty: "Intermediate", title: "Should AI systems be required to explain their decisions?" },

  { format: "AI Debate Simulation", difficulty: "Hard", title: "Should AI be granted rights similar to those of humans?" },
  { format: "AI Debate Simulation", difficulty: "Hard", title: "Can an AI system ever be held morally responsible for its actions?" },
  { format: "AI Debate Simulation", difficulty: "Hard", title: "Should AI development be paused until stronger regulations exist?" },
  { format: "AI Debate Simulation", difficulty: "Hard", title: "Is superintelligent AI an existential risk to humanity?" },
  { format: "AI Debate Simulation", difficulty: "Hard", title: "Should AI be permitted to make autonomous military decisions?" },
  { format: "AI Debate Simulation", difficulty: "Hard", title: "Should there be a global governing body to regulate AI development?" },
  { format: "AI Debate Simulation", difficulty: "Hard", title: "Can AI-generated arguments be considered genuinely persuasive, or only mimicry?" },
  { format: "AI Debate Simulation", difficulty: "Hard", title: "Should AI systems be allowed to negotiate legal contracts autonomously?" },
  { format: "AI Debate Simulation", difficulty: "Hard", title: "Is it ethical to create AI systems capable of simulating human consciousness?" },
  { format: "AI Debate Simulation", difficulty: "Hard", title: "Should AI companies be liable for the societal harms caused by their models?" },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let created = 0;
  let skipped = 0;

  for (const t of TOPICS) {
    const exists = await Topic.findOne({ title: t.title });
    if (exists) {
      skipped++;
      continue;
    }
    await Topic.create(t);
    created++;
  }

  console.log(`Done. Created ${created} topics, skipped ${skipped} duplicates.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
