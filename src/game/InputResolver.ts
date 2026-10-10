export type TimedButton = Readonly<{ isDown: boolean; timeDown: number }>;

export function resolvePriorityAxis(
  negativeButtons: readonly TimedButton[],
  positiveButtons: readonly TimedButton[],
): -1 | 0 | 1 {
  const latestNegative = latestDown(negativeButtons);
  const latestPositive = latestDown(positiveButtons);
  if (latestNegative < 0 && latestPositive < 0) return 0;
  if (latestNegative === latestPositive) return 0;
  return latestPositive > latestNegative ? 1 : -1;
}

function latestDown(buttons: readonly TimedButton[]): number {
  return buttons.reduce((latest, button) => button.isDown ? Math.max(latest, button.timeDown) : latest, -1);
}
