import type React from "react";
import { IconStore } from "@/components/icons";
import type { DashboardPageModel } from "../../DashboardPage.module";

interface IDashboardHeader extends Pick<
  DashboardPageModel,
  "dateLabel" | "memberships" | "activeShopId" | "setActiveShopId"
> {
  memberships: Pick<
    DashboardPageModel,
    "dateLabel" | "memberships" | "activeShopId" | "setActiveShopId"
  >["memberships"];
}

export const DashboardHeader: React.FC<IDashboardHeader> = ({
  dateLabel,
  memberships,
  activeShopId,
  setActiveShopId,
}) => {
  return (
    <header className="page-header screen-header -mx-4 flex flex-col gap-0.5 px-4">
      <p className="text-[12px] font-medium uppercase leading-[17px] tracking-[1.5px] text-[#CC785C]">
        {dateLabel}
      </p>
      <div className="flex items-center justify-between">
        <h1 className="font-['Cormorant_Garamond',serif] text-[36px] leading-[43.6px] tracking-[-0.5px] text-[#141413]">
          Dashboard
        </h1>
        {memberships.length > 1 && activeShopId ? (
          <label className="flex items-center gap-1.5 rounded-full border border-[#E6DFD8] bg-[#FAF9F5] py-1.5 pl-3 pr-2 text-[13px] font-medium text-[#141413]">
            <IconStore className="h-4 w-4 text-[#A09D96]" />
            <span className="sr-only">Active shop</span>
            <select
              value={activeShopId}
              onChange={(event) => setActiveShopId(event.target.value)}
              className="max-w-[7rem] bg-transparent font-medium text-[#141413] outline-none"
            >
              {memberships.map((row) => (
                <option key={row.shopId} value={row.shopId}>
                  {row.shops.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </header>
  );
};
