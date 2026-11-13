/**
 * Starting attribute sets for common industries. A preset only pre-fills the
 * project wizard; teams can add, remove or rename attributes before creating
 * the project. Names are starting points to be reviewed with domain experts.
 *
 * Built-in names (Recommendation, Requirement, Links, Evidence, Severity,
 * Likelihood, Action Owner, …) keep their special behaviour; any other name is
 * a project-specific custom attribute.
 */

export const ATTRIBUTE_PRESETS = [
  {
    id: 'general',
    label: 'General human factors',
    description: 'Recommendations, requirements and evidence with a basic severity and likelihood.',
    hf: ['Recommendation', 'Requirement', 'Links', 'Evidence'],
    risk: ['Severity', 'Likelihood'],
    action: ['Action Owner', 'Artifact Type'],
  },
  {
    id: 'medical-usability',
    label: 'Medical device usability',
    description: 'Use errors and critical tasks, with harm level and verification tracking.',
    hf: ['Recommendation', 'Requirement', 'Evidence', 'Use error', 'Critical task'],
    risk: ['Severity', 'Likelihood', 'Harm level'],
    action: ['Action Owner', 'Verification method'],
  },
  {
    id: 'aviation-flight-deck',
    label: 'Aviation flight deck',
    description: 'Crew workload and automation issues, with design-change references.',
    hf: ['Recommendation', 'Requirement', 'Evidence', 'Crew workload', 'Automation mode'],
    risk: ['Severity', 'Likelihood', 'Risk rating'],
    action: ['Action Owner', 'Design change ref'],
  },
  {
    id: 'rail-control',
    label: 'Rail and transport control',
    description: 'Operator error and alarm handling, with a safety integrity level.',
    hf: ['Recommendation', 'Requirement', 'Evidence', 'Operator error', 'Alarm handling'],
    risk: ['Severity', 'Likelihood', 'SIL level'],
    action: ['Action Owner', 'Safety case ref'],
  },
  {
    id: 'control-room',
    label: 'Control room (energy, process, defence)',
    description: 'Task criticality and alarm priority, with verification references.',
    hf: ['Recommendation', 'Requirement', 'Evidence', 'Task criticality', 'Alarm priority'],
    risk: ['Severity', 'Likelihood'],
    action: ['Action Owner', 'Verification ref'],
  },
];

/**
 * Merge a preset into the current selections. Only names the administrator
 * offers are selected (matched case-insensitively and stored under the offered
 * spelling); the rest are returned in `missing` so the user can be told.
 * @param {{hf: string[], risk: string[], action: string[]}} current
 * @param {{hf: string[], risk: string[], action: string[]}} preset
 * @param {{hf: string[], risk: string[], action: string[]}} options - offered names
 * @returns {{ selections: {hf: string[], risk: string[], action: string[]}, missing: string[] }}
 */
export function mergePreset(current, preset, options) {
  const selections = {};
  const missing = [];
  for (const category of ['hf', 'risk', 'action']) {
    const offered = new Map((options?.[category] ?? []).map((name) => [name.toLowerCase(), name]));
    const seen = new Set((current[category] ?? []).map((name) => name.toLowerCase()));
    const out = [...(current[category] ?? [])];
    for (const name of preset[category] ?? []) {
      const key = name.toLowerCase();
      if (!offered.has(key)) {
        missing.push(name);
        continue;
      }
      if (!seen.has(key)) {
        seen.add(key);
        out.push(offered.get(key));
      }
    }
    selections[category] = out;
  }
  return { selections, missing: [...new Set(missing)] };
}
