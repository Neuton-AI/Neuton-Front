import type React from "react";
interface IIconUpload extends React.SVGProps<SVGSVGElement> {
  suppressHydrationWarning?: React.SVGProps<SVGSVGElement>["suppressHydrationWarning"];
}

export const IconUpload: React.FC<IIconUpload> = ({ ...props }) => {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.83}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.75 13.75v1.83a2.75 2.75 0 0 0 2.75 2.75h11a2.75 2.75 0 0 0 2.75-2.75v-1.83" />
      <path d="M6.42 7.33 11 2.75l4.58 4.58" />
      <path d="M11 2.75v11" />
    </svg>
  );
};
