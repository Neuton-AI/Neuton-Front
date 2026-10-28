import type React from "react";
interface IIconUpload extends React.SVGProps<SVGSVGElement> {
  suppressHydrationWarning?: React.SVGProps<SVGSVGElement>["suppressHydrationWarning"];
}

export const IconUpload: React.FC<IIconUpload> = ({ ...props }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 16V3M7 8L12 3L17 8M4 15V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V15" />
    </svg>
  );
};
