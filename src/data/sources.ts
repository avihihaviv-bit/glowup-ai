/**
 * Source registry. Every URL here was confirmed to exist via web search results (Nov 2026).
 * Tips and pages may only cite sources from this list. Do not add URLs that were not verified.
 */
export interface Source {
  org: string;
  title: string;
  url: string;
}

export const SOURCES = {
  aadFaceWash: { org: "AAD", title: "Face washing 101", url: "https://www.aad.org/public/everyday-care/skin-care-basics/care/face-washing-101" },
  aadAcneHabits: { org: "AAD", title: "10 skin care habits that can worsen acne", url: "https://www.aad.org/public/diseases/acne/skin-care/habits-stop" },
  aadAcneTips: { org: "AAD", title: "Acne: Tips for managing", url: "https://www.aad.org/public/diseases/acne/skin-care/tips" },
  aadAcneWontClear: { org: "AAD", title: "9 things to try when acne won't clear", url: "https://www.aad.org/public/diseases/acne/diy/wont-clear" },
  aadDeepPimple: { org: "AAD", title: "Tips to treat a deep, painful pimple", url: "https://www.aad.org/public/diseases/acne/diy/treat-deep-painful-pimple" },
  aadAcneMoisturizer: { org: "AAD", title: "Moisturizer: Why you may need it if you have acne", url: "https://www.aad.org/public/diseases/acne/skin-care/moisturizer" },
  aadOily: { org: "AAD", title: "How to control oily skin", url: "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin" },
  aadDry: { org: "AAD", title: "Dermatologists' top tips for relieving dry skin", url: "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin" },
  aadPickMoisturizer: { org: "AAD", title: "How to pick the right moisturizer for your skin", url: "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer" },
  aadBudget: { org: "AAD", title: "Skin care on a budget", url: "https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-budget" },
  aadMen: { org: "AAD", title: "Skin care tips for men", url: "https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-for-men" },
  aadTestProducts: { org: "AAD", title: "How to test skin care products", url: "https://www.aad.org/public/everyday-care/skin-care-secrets/prevent-skin-problems/test-skin-care-products" },
  aadContactDermatitis: { org: "AAD", title: "Itchy rash could be contact dermatitis", url: "https://www.aad.org/public/everyday-care/itchy-skin/rash/itchy-rash-contact-dermatitis" },
  aadPores: { org: "AAD", title: "What can treat large facial pores?", url: "https://www.aad.org/public/everyday-care/skin-care-secrets/face/treat-large-pores" },
  aadRedness: { org: "AAD", title: "10 reasons your face is red", url: "https://www.aad.org/public/everyday-care/skin-care-secrets/face/facial-redness" },
  aadExfoliate: { org: "AAD", title: "How to safely exfoliate at home", url: "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home" },
  aadSunscreenApply: { org: "AAD", title: "How to apply sunscreen", url: "https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-apply-sunscreen" },
  aadSunscreenChoose: { org: "AAD", title: "How do I know if I'm using the right sunscreen?", url: "https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/choosing-right-sunscreen" },
  aadSunscreenMistakes: { org: "AAD", title: "5 common sunscreen mistakes", url: "https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/common-sunscreen-mistakes" },
  aadHair: { org: "AAD", title: "Tips for healthy hair", url: "https://www.aad.org/public/everyday-care/hair-scalp-care/hair/healthy-hair-tips" },
  aadHairHabits: { org: "AAD", title: "10 hair care habits that can damage your hair", url: "https://www.aad.org/public/everyday-care/hair-scalp-care/hair/habits-that-damage-hair" },
  aadCurly: { org: "AAD", title: "6 curly hair care tips from dermatologists", url: "https://www.aad.org/public/everyday-care/hair-scalp-care/hair/curly-hair-care" },
  aadLeaveIn: { org: "AAD", title: "Dermatologists' top tips for using leave-in conditioner", url: "https://www.aad.org/public/everyday-care/hair-scalp-care/hair/leave-in-conditioner-tips" },
  aadShave: { org: "AAD", title: "Hair removal: How to shave", url: "https://www.aad.org/public/everyday-care/skin-care-basics/hair/how-to-shave" },
  aadRazorBumps: { org: "AAD", title: "6 razor bump prevention tips from dermatologists", url: "https://www.aad.org/public/everyday-care/skin-care-basics/hair/razor-bump-prevention" },
  aadBeard: { org: "AAD", title: "DIY treatment for 5 common beard problems", url: "https://www.aad.org/public/everyday-care/skin-care-secrets/face/diy-treatment-common-beard-problems" },
  adaMouthrinse: { org: "ADA", title: "Mouthrinse (Mouthwash)", url: "https://www.ada.org/resources/ada-library/oral-health-topics/mouthrinse-mouthwash" },
  nhsTeeth: { org: "NHS", title: "How to keep your teeth clean", url: "https://www.nhs.uk/live-well/healthy-teeth-and-gums/how-to-keep-your-teeth-clean/" },
  nhsBadBreath: { org: "NHS", title: "Bad breath", url: "https://www.nhs.uk/symptoms/bad-breath/" },
  nhsBloating: { org: "NHS", title: "Bloating", url: "https://www.nhs.uk/conditions/bloating/" },
  nhsBodyOdour: { org: "NHS", title: "Body odour (BO)", url: "https://www.nhs.uk/symptoms/body-odour-bo/" },
  nhsSweating: { org: "NHS", title: "Excessive sweating (hyperhidrosis)", url: "https://www.nhs.uk/conditions/excessive-sweating-hyperhidrosis/" },
  nhsWater: { org: "NHS", title: "Water, drinks and hydration", url: "https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/" },
  nhsPosture: { org: "NHS", title: "Common posture mistakes and fixes", url: "https://www.nhs.uk/Live-well/exercise/strength-and-flexibility-exercises/common-posture-mistakes-and-fixes/" },
  cdcSleep: { org: "CDC", title: "About Sleep", url: "https://www.cdc.gov/sleep/about/index.html" },
  cdcActivityAdults: { org: "CDC", title: "Adult Activity: An Overview", url: "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html" },
  cdcActivity: { org: "CDC", title: "What You Can Do to Meet Physical Activity Recommendations", url: "https://www.cdc.gov/physical-activity-basics/guidelines/index.html" },
  mayoBags: { org: "Mayo Clinic", title: "Bags under eyes: Diagnosis and treatment", url: "https://www.mayoclinic.org/diseases-conditions/bags-under-eyes/diagnosis-treatment/drc-20369931" },
  mayoBagsCauses: { org: "Mayo Clinic", title: "Bags under eyes: Symptoms and causes", url: "https://www.mayoclinic.org/diseases-conditions/bags-under-eyes/symptoms-causes/syc-20369927" },
} satisfies Record<string, Source>;

export type SourceKey = keyof typeof SOURCES;

export const TOPIC_SOURCES: Record<string, SourceKey[]> = {
  oral: ["nhsTeeth", "nhsBadBreath", "adaMouthrinse"],
  debloat: ["nhsBloating", "mayoBags", "mayoBagsCauses", "nhsWater"],
  skin: ["aadFaceWash", "aadAcneTips", "aadSunscreenChoose", "aadExfoliate", "aadDry"],
  hair: ["aadHair", "aadHairHabits", "aadCurly", "aadLeaveIn"],
  grooming: ["aadShave", "aadRazorBumps", "aadBeard", "nhsBodyOdour"],
  fragrance: ["aadContactDermatitis", "aadTestProducts"],
  sleep: ["cdcSleep"],
  posture: ["nhsPosture"],
  fitness: ["cdcActivityAdults", "cdcActivity"],
};
