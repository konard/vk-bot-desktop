/**
 * Ten short Russian birthday greetings, each with at most two emojis,
 * matching the issue requirement "simple default 10 messages similar to
 * 'Поздравляю с днём рождения!', with different emojis, but not too much
 * of them not more than 2 per message."
 */
export const BIRTHDAY_GREETINGS = [
  '🎉 Поздравляю с днём рождения!',
  'С днём рождения! 🎂',
  '🎈 Поздравляю с праздником!',
  'Желаю всего самого лучшего! 🌟',
  '🥳 С днём рождения!',
  'Счастья и здоровья! 💐',
  '🎁 С днём рождения! Пусть всё получится.',
  'Радости и улыбок! ☀️',
  'С днём рождения! Пусть мечты сбываются. ✨',
  'Поздравляю! Удачи во всём. 🍀',
];

let lastIndex = -1;

export function pickBirthdayGreeting(rng = Math.random) {
  if (BIRTHDAY_GREETINGS.length === 0) {
    return '';
  }
  let index;
  do {
    index = Math.floor(rng() * BIRTHDAY_GREETINGS.length);
  } while (index === lastIndex && BIRTHDAY_GREETINGS.length > 1);
  lastIndex = index;
  return BIRTHDAY_GREETINGS[index];
}

export function resetBirthdayGreetingState() {
  lastIndex = -1;
}
