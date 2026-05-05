export function formatIdeaPrice(price: number | null) {
  if (price === null) {
    return "Cena: nie podano";
  }

  return `Cena: ${price.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`;
}

export function formatIdeaVoteCount(count: number) {
  if (count === 1) {
    return "1 głos";
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return `${count} głosy`;
  }

  return `${count} głosów`;
}
