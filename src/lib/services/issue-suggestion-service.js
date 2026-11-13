import { completeChat } from './ai-service';
import { normaliseClassification, normaliseRecommendations, parseModelJson } from '@/lib/ai-suggestion-rules';
import { isDerivedHfAttribute } from '@/lib/attribute-rules';

const SYSTEM =
  'You assist a human-factors analyst. You draft suggestions for a person to review; you never decide. ' +
  'Reply with a single JSON object and no other text.';

function issueSummary(issue) {
  return [
    `Title: ${issue.title}`,
    `Source: ${issue.source || '—'}`,
    `Description: ${issue.description || '—'}`,
    `Consequences: ${issue.consequences || '—'}`,
  ].join('\n');
}

/**
 * Ask the configured model for suggestions for one issue.
 * @param {'recommendations'|'classify'} kind
 * @param {object} issue - serialized issue
 * @param {object} project - needs hfAttributes
 * @returns {Promise<{ kind: string, recommendations?: object[], classification?: object }>}
 */
export async function suggestForIssue(kind, issue, project) {
  if (kind === 'recommendations') {
    const reply = await completeChat([
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content:
          `Issue:\n${issueSummary(issue)}\n\n` +
          'Suggest up to three recommendations that would address this issue, each with up to five requirements ' +
          'that would show the recommendation is met. Return JSON: ' +
          '{"recommendations":[{"text":"...","requirements":["..."]}]}',
      },
    ]);
    return { kind, recommendations: normaliseRecommendations(parseModelJson(reply)) };
  }

  const customHf = (project.hfAttributes ?? []).filter((name) => !isDerivedHfAttribute(name));
  const reply = await completeChat([
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content:
        `Issue:\n${issueSummary(issue)}\n\n` +
        'Classify this issue as usability, safety or both. Choose any of these project attributes that apply: ' +
        `${customHf.length ? customHf.join(', ') : '(none)'}. Return JSON: ` +
        '{"issueType":"usability|safety|both","reasoning":"one or two sentences","hfAttributes":["..."]}',
    },
  ]);
  return { kind, classification: normaliseClassification(parseModelJson(reply), customHf) };
}
