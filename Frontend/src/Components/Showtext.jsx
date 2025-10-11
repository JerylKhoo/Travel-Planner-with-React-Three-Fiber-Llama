const timeouts = {};

export function showText(target, message, index, interval) {
  // Cancel any existing animation for this target
  if (timeouts[target]) {
    clearTimeout(timeouts[target]);
  }

  const targetElem = document.getElementById(target);
  if (targetElem && index < message.length) {
    targetElem.textContent = message.slice(0, index + 1);
    timeouts[target] = setTimeout(() => showText(target, message, index + 1, interval), interval);
  } else {
    delete timeouts[target];
  }
}