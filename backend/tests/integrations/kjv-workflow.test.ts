import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveKjv } from '../../src/integrations/kjv.js';
import { selectSourceExcerpt, validateStoryRetelling } from '../../src/integrations/study-workflow.js';

test('KJV resolver supplies exact ordered full verses and rejects unsupported ranges', () => {
  const reading=resolveKjv('John 3:16-17');
  assert.equal(reading?.translation,'KJV');
  assert.equal(reading?.edition,'1769');
  assert.deepEqual(reading?.verses.map(verse=>verse.number),[16,17]);
  assert.match(reading!.verses[0]!.text,/For God so loved the world/);
  assert.equal(reading!.verses[0]!.text.startsWith('¶'),false);
  assert.match(reading!.verses[1]!.text,/For God sent not his Son/);
  assert.equal(resolveKjv('NIV John 3:16'),null);
  assert.equal(resolveKjv('John 3:16-50'),null);
  assert.equal(resolveKjv('John 3:99'),null);
});

test('story source selection reaches a relevant account after the first 4,000 characters', () => {
  const source='General background. '.repeat(400)+'\n\nMaria crossed the river to deliver food. Jonah found her boat and helped the stranded family.\n\nOther notes.';
  const excerpt=selectSourceExcerpt(source,'Explain Maria and Jonah crossing the river in the story');
  assert.match(excerpt,/Maria crossed the river/);
  assert.match(excerpt,/Jonah found her boat/);
  assert.match(excerpt,/characters \d+-\d+/);
  assert.throws(()=>selectSourceExcerpt('Unrelated notes. '.repeat(500),'Explain the lighthouse rescue story'),/could not be located/);
  assert.throws(()=>validateStoryRetelling('This story teaches us the importance of helping.','Maria crossed the river and Jonah helped her return.','Retell the story'),/does not retell enough named events/);
  assert.doesNotThrow(()=>validateStoryRetelling('Maria crossed the river. Jonah found her boat and helped the stranded family.','Maria crossed the river and Jonah helped her return.','Retell the story'));
});
