interface AvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Avatar({ name, image, size = "md" }: AvatarProps) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
    xl: "h-20 w-20 text-2xl",
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-white/20`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-secondary text-white flex items-center justify-center font-bold`}
    >
      {initials}
    </div>
  );
}
