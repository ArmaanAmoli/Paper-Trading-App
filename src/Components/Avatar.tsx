interface AvatarProps {
  name?: string | null;
  avatar?: string | null;
  size?: number;
}

export default function Avatar({ name, avatar, size = 32 }: AvatarProps) {
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
        backgroundImage: avatar ? `url(${avatar})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
      aria-hidden="true"
    >
      {showLetter && !avatar ? initial : null}
    </div>
  );
}
