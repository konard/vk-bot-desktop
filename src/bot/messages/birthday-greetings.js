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

export function pickBirthdayGreeting(
  rng = Math.random,
  list = BIRTHDAY_GREETINGS
) {
  if (!Array.isArray(list) || list.length === 0) {
    return '';
  }
  if (list.length === 1) {
    lastIndex = 0;
    return list[0];
  }
  let index;
  do {
    index = Math.floor(rng() * list.length);
  } while (index === lastIndex);
  lastIndex = index;
  return list[index];
}

export function resetBirthdayGreetingState() {
  lastIndex = -1;
}
