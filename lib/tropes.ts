// lib/tropes.ts
// Trope Tree: genre → subgenre → tropes
// "Write your own" is always appended as the last option at every level.

export const TROPE_TREE: Record<string, Record<string, string[]>> = {
  Romance: {
    Contemporary: ["Enemies to Lovers", "Forced Proximity", "Forbidden Romance", "Age Gap", "Second Chance", "Grumpy/Sunshine", "Roommates", "Brother's Best Friend", "Fake Dating", "Office Romance", "Single Parent", "Small Town", "Sports Romance", "Slow Burn", "Friends to Lovers", "Love Triangle", "Marriage of Convenience", "Secret Billionaire", "Bodyguard", "Opposites Attract"],
    Dark: ["Enemies to Lovers", "Forced Proximity", "Forbidden Romance", "Age Gap", "Captive Romance", "Antihero", "Morally Grey", "Obsessive Love", "Revenge Romance", "Power Imbalance", "Dark Secret", "Mafia/Cartel", "Arranged Marriage", "Possessive Hero", "Redemption Arc", "Forbidden Desire", "Trauma Bond", "Secret Identity", "Dangerous Man", "Found Family"],
    Steamy: ["Forbidden Romance", "Enemies to Lovers", "Age Gap", "Boss/Employee", "Friends with Benefits", "One Night Stand", "Forced Proximity", "Fake Dating", "Secret Affair", "Vacation Romance", "Grumpy/Sunshine", "Slow Burn", "Second Chance", "Bodyguard", "Roommates", "Sports Romance", "Small Town", "Marriage of Convenience", "Opposites Attract", "Love Triangle"],
    "Romantic Suspense": ["Protector Romance", "Witness Protection", "Undercover Agent", "Second Chance", "Enemies to Lovers", "Forbidden Romance", "Secret Identity", "On the Run", "Bodyguard", "Forced Proximity", "Dark Secret", "Dangerous Attraction", "Revenge", "Hidden Past", "Race Against Time", "Partners", "Fake Relationship", "Reluctant Hero", "Redemption", "Trust Issues"],
    Paranormal: ["Fated Mates", "Vampire Romance", "Werewolf/Shifter", "Witch/Warlock", "Forbidden Love (Human/Supernatural)", "Second Chance", "Enemies to Lovers", "Chosen One", "Hidden Powers", "Immortal/Mortal", "Dark Prophecy", "Soul Bond", "Magic Gone Wrong", "Ancient Curse", "Reluctant Hero", "Found Family", "Power Imbalance", "Secret World", "Redemption Arc", "Love Triangle"],
    Historical: ["Marriage of Convenience", "Forbidden Romance", "Second Chance", "Enemies to Lovers", "Rake/Wallflower", "Class Difference", "Forced Proximity", "Secret Identity", "Arranged Marriage", "Widow/Widower", "Governess Romance", "Opposites Attract", "Slow Burn", "Scandal", "Forbidden Desire", "Hidden Past", "Redemption Arc", "Adventure Romance", "War Romance", "Season Debut"],
  },
  Mystery: {
    Cozy: ["Amateur Sleuth", "Small Town Secrets", "Animal Sidekick", "Bakery/Shop Owner", "Found Family", "Fish Out of Water", "Recurring Detective", "Quirky Townsfolk", "Cold Case", "Hidden Identity", "Unlikely Friendship", "Local Rivalry", "Reluctant Hero", "Nosy Neighbor", "Craft/Hobby Tie-in", "Tourist Trap", "Festival Setting", "Secret Past", "Old Money", "New in Town"],
    "Psychological Suspense": ["Unreliable Narrator", "Gaslighting", "Hidden Identity", "Dark Secret", "Obsession", "Revenge", "Trust Issues", "Twist Ending", "Paranoia", "Double Cross", "Memory Loss", "Manipulation", "False Accusation", "Missing Person", "Suburban Secrets", "Marriage in Crisis", "Stalker", "Second Chance", "Grief", "Family Secrets"],
    "Police Procedural": ["Partnership Dynamics", "Cold Case", "Serial Killer", "Race Against Time", "Corruption", "Redemption Arc", "Family Secrets", "Political Intrigue", "Missing Person", "Undercover", "Witness Protection", "Wrongful Conviction", "Small Town vs City", "Reluctant Partnership", "Personal Stakes", "Mentor/Rookie", "Obsessive Detective", "Dark Past", "Vigilante Justice", "Unexpected Ally"],
    "Amateur Sleuth": ["Fish Out of Water", "Reluctant Hero", "Nosy Amateur", "Small Town", "Personal Stakes", "Unlikely Friendship", "Hidden Talent", "Local Knowledge", "Recurring Character", "Cozy Setting", "Cold Case", "Family Secret", "New in Town", "Hobby-Based Clues", "Quirky Sidekick", "Dangerous Curiosity", "Disbelieving Authority", "Unexpected Witness", "Romance Subplot", "Found Family"],
  },
  "Sweet & Clean": {
    Contemporary: ["Second Chance", "Small Town", "Single Parent", "Friends to Lovers", "Fake Dating", "Opposites Attract", "Forced Proximity", "Slow Burn", "Grumpy/Sunshine", "Fish Out of Water", "Found Family", "Holiday Romance", "Neighbors", "Childhood Sweethearts", "Workplace Romance", "Redemption Arc", "Coming Home", "New Beginnings", "Mentor/Protege", "Unlikely Friendship"],
    Inspirational: ["Faith Journey", "Redemption Arc", "Second Chance", "Found Family", "Community", "Small Town", "Single Parent", "Healing", "New Beginnings", "Coming Home", "Unlikely Friendship", "Mentor/Protege", "Forgiveness", "Hope", "Slow Burn", "Holiday Romance", "Mission Trip", "Church Community", "Grief Journey", "Service to Others"],
    Wholesome: ["Found Family", "Small Town", "Holiday Romance", "Second Chance", "Friends to Lovers", "Slow Burn", "Neighbors", "Single Parent", "Coming Home", "New Beginnings", "Unlikely Friendship", "Community", "Cozy Setting", "Healing", "Pet Sidekick", "Opposites Attract", "Childhood Sweethearts", "Fish Out of Water", "Redemption", "Hope"],
  },
  "Paranormal & Fantasy": {
    "Urban Fantasy": ["Chosen One", "Hidden Magic World", "Enemies to Lovers", "Fated Mates", "Reluctant Hero", "Secret Identity", "Ancient Prophecy", "Found Family", "Power Awakening", "Forbidden Magic", "Dark vs Light", "Morally Grey Hero", "Love Triangle", "Redemption Arc", "Race Against Time", "Mentor/Apprentice", "Political Intrigue", "Hidden Past", "Unlikely Alliance", "Sacrifice"],
    "Fantasy Romance": ["Fated Mates", "Enemies to Lovers", "Forbidden Love", "Chosen One", "Political Marriage", "Power Imbalance", "Magic Bond", "Ancient Curse", "Hidden Identity", "Slow Burn", "Rivals to Lovers", "Forced Proximity", "Dark Secret", "Found Family", "Redemption Arc", "Prophecy", "Morally Grey", "War Romance", "Class Difference", "Sacrifice for Love"],
  },
  Thriller: {
    Domestic: ["Unreliable Narrator", "Marriage in Crisis", "Hidden Identity", "Dark Secret", "Suburban Secrets", "Gaslighting", "Obsession", "False Accusation", "Trust Issues", "Family Secrets", "Missing Person", "Revenge", "Paranoia", "Twist Ending", "Manipulation", "Past Trauma", "New Neighbor", "Perfect Life Facade", "Affair", "Double Cross"],
    "Psychological Thriller": ["Unreliable Narrator", "Obsession", "Dark Secret", "Identity Crisis", "Manipulation", "Paranoia", "Revenge", "Hidden Past", "Gaslighting", "Twist Ending", "False Memory", "Stalker", "Double Cross", "Race Against Time", "Trust No One", "Missing Person", "Conspiracy", "Dark Psychology", "Trauma", "Power Games"],
  },
  Historical: {
    "Historical Fiction": ["War & Survival", "Class Struggle", "Hidden Identity", "Forbidden Love", "Family Saga", "Coming of Age", "Political Intrigue", "Immigrant Story", "Resistance Fighter", "Redemption Arc", "Lost & Found", "Secrets Across Generations", "Social Change", "Adventure", "Betrayal", "Unlikely Alliance", "Historical Event Backdrop", "Strong Female Lead", "Sacrifice", "Found Family"],
    "Historical Romance": ["Marriage of Convenience", "Rake/Wallflower", "Forbidden Romance", "Second Chance", "Class Difference", "Forced Proximity", "Secret Identity", "Arranged Marriage", "Governess Romance", "Scandal", "Season Debut", "Hidden Past", "Redemption Arc", "Slow Burn", "Adventure Romance", "War Romance", "Widow/Widower", "Opposites Attract", "Power Imbalance", "Enemies to Lovers"],
  },
}

export const GENRES = [...Object.keys(TROPE_TREE), "Write your own"]

export function getSubgenres(genre: string): string[] {
  if (!TROPE_TREE[genre]) return []
  return [...Object.keys(TROPE_TREE[genre]), "Write your own"]
}

export function getTropes(genre: string, subgenre: string): string[] | null {
  if (!TROPE_TREE[genre]?.[subgenre]) return null
  return TROPE_TREE[genre][subgenre]
}
