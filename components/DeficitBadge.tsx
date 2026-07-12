type DeficitBadgeProps = {
  points: number;
};

export function DeficitBadge({ points }: DeficitBadgeProps) {
  return (
    <span className="deficit-badge" aria-label={`最少再加 ${points} 級分`}>
      最少 +{points}
    </span>
  );
}
