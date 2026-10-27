interface AvatarProps {
  name?: string | null;
  size?: number;
}

export default function Avatar({ name, size = 32 }: AvatarProps) {
  const getInitial = (name?: string | null) => {
    if (!name || !name.trim()) return '?';
    return name.trim().charAt(0).toUpperCase();
  };

  const initial = getInitial(name);
  const fontSize = Math.round(size * 0.4);
  const showLetter = !!(name && name.trim().length > 0);

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: fontSize,
      }}
      aria-hidden="true"
    >
      {showLetter ? initial : null}
    </div>
  );
}
