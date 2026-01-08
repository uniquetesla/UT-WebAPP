const baseClasses = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50";

const variants = {
  default: "bg-slate-900 text-white hover:bg-slate-800",
  outline: "border border-slate-300 text-slate-700 hover:bg-slate-100",
  ghost: "text-slate-600 hover:bg-slate-100"
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2",
  lg: "px-5 py-3 text-base"
};

export function Button({ className = "", variant = "default", size = "md", ...props }) {
  return (
    <button
      className={`${baseClasses} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    />
  );
}
