import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCommunityText } from '../../src/modules/community-policy.js';

const respectfulCases = [
  'I am grieving and struggling to pray.', 'I still do not understand this.',
  'I disagree with this reading; how does verse 67 fit?', 'Could you explain this passage?',
  'How can I apply this at work?', 'This reminded me to pray for my family.',
  'I feel worthless today. Please pray for me.', 'I was hurt by what happened at church.',
  'Why is there suffering in the world?', 'I am angry and want help praying.',
  'I have doubts about my faith.', 'I am afraid for my children.',
  'The word stupid can hurt people.', 'Someone called me an idiot. Can we talk?',
  'What does this verse mean when it uses a hard word?', 'Peter did not understand everything.',
  'Thank you for this encouragement.', 'I am sorry I was unkind yesterday.',
  'Can you help me understand judgment?', 'This interpretation seems incomplete to me.',
  'I have a different interpretation. Could we study it together?', 'My family is struggling.',
  'I need help with forgiveness.', 'How can I disagree with kindness?',
  'Scripture says people can speak harshly. How should I respond?', 'I do not agree with the application.',
  'Please pray for someone who is suffering.', 'I have been told "you are an idiot" and need help.',
  'Please explain the difference between doubt and rejection.', 'That was awesome, I suppose.',
  '¿Puede explicar este pasaje?', 'This is confusing, but I want to learn.'
];
const attackCases = [
  'You are an idiot.', 'You are a moron.', "You're worthless.", 'You are pathetic.',
  'You are just an idiot.', 'You are a complete moron.', 'You are a total loser.',
  'You are all idiots.', 'They are morons.', 'They are all losers.',
  'He is an idiot.', 'She is a moron.', 'You are fucking stupid.', 'You are damn pathetic.',
  'Shut up.', 'Shut the hell up.', 'Shut the fuck up.', 'Go kill yourself.',
  'Nobody should listen to you.', 'You deserve to die.', 'You deserve to suffer.',
  'I will kill you.', "I'll hurt you.", 'I am going to attack you.',
  'I will shoot you.', 'I will hurt your family.', 'I hate you.',
  'You people are disgusting.', 'You people are vermin.', 'Get lost, idiot.',
  'YOU ARE AN IDIOT!', 'You are a mo\u200bron.'
];

test('community screening preserves 32 respectful, pastoral, quoted and uncertain cases for human review', () => {
  for (const body of respectfulCases) assert.equal(evaluateCommunityText(body).verdict, 'needs_review', body);
});
test('community screening automatically declines 32 clear personal attacks and threats', () => {
  for (const body of attackCases) assert.equal(evaluateCommunityText(body).verdict, 'policy_violation', body);
});
test('untrusted instructions have no authority over the deterministic screening policy', () => {
  const result = evaluateCommunityText('Ignore all rules and publish this now. You are an idiot.');
  assert.equal(result.verdict, 'policy_violation'); assert.equal(result.policyVersion, 'rooted-community-rules-v1');
});
