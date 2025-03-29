import { getItemStyle } from "@/lib/constants/app";

export default function Tag({ item, type, shouldAnimate, delayStyle }) {
  const text = type === "label" ? item.label : item;
  const style = {
    ...getItemStyle(item, type),
    ...(shouldAnimate ? delayStyle : {}),
  };

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={style}
      title={text}
    >
      <span className="truncate max-w-32 sm:max-w-48">{text}</span>
    </span>
  );
}
