import logger from '../logger.js';
import { pickBirthdayGreeting } from '../messages/birthday-greetings.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function findBirthdayFriends({ friends, today = new Date() } = {}) {
  if (!Array.isArray(friends)) {
    return [];
  }
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const matches = [];
  for (const friend of friends) {
    if (!friend.bdate) {
      continue;
    }
    const parts = String(friend.bdate).split('.');
    if (parts.length < 2) {
      continue;
    }
    const friendDay = Number(parts[0]);
    const friendMonth = Number(parts[1]);
    if (friendDay === day && friendMonth === month) {
      matches.push(friend);
    }
  }
  return matches;
}

export async function sendBirthdayCongratulations({ vk, config }) {
  if (config.features?.sendBirthdayCongratulations === false) {
    return;
  }
  const friends = await collectFriendsWithBirthday({ vk });
  const targets = findBirthdayFriends({ friends });
  logger.info('Birthday targets identified', { count: targets.length });
  for (const friend of targets) {
    try {
      const message = pickBirthdayGreeting();
      await vk.api.messages.send({
        user_id: friend.id,
        message,
        random_id: Math.floor(Math.random() * 1e9),
      });
      logger.info('Birthday message sent', {
        userId: friend.id,
        message,
      });
      await sleep(5000);
    } catch (error) {
      logger.warn('Could not send birthday message', {
        userId: friend.id,
        error,
      });
    }
  }
}

async function collectFriendsWithBirthday({ vk }) {
  const items = [];
  for (let offset = 0; offset < 10000; offset += 5000) {
    const response = await vk.api.friends.get({
      count: 5000,
      offset,
      fields: 'bdate',
    });
    if (!response.items || response.items.length === 0) {
      break;
    }
    for (const item of response.items) {
      items.push(typeof item === 'object' ? item : { id: item });
    }
    if (response.items.length < 5000) {
      break;
    }
  }
  return items;
}
