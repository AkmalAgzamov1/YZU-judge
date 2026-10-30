// Initial on a YZU color. The same name always gets the same color.
const palette = [
  "bg-yzu-red text-white",
  "bg-yzu-blue text-white",
  "bg-yzu-yellow text-black",
];

function colorFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

const sizes = {
  sm: "h-6 w-6 text-xs",
  lg: "h-16 w-16 text-2xl",
};

export default function Avatar({ name, size = "sm" }: { name: string; size?: keyof typeof sizes }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold uppercase ${sizes[size]} ${colorFor(name)}`}
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
