import { renderWithRouter } from "@/test/render";
import { buildReceiptDetail } from "@/test/factories/receipts.factory";
import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ReceiptRow } from "../components/ReceiptRow/ReceiptRow";

it.each([null, undefined, "", "   "])(
  "uses Unknown merchant for a missing/blank name (%s)",
  (merchantName) => {
    const receipt = buildReceiptDetail({
      merchantName: merchantName as string | null,
      originalFilename: "builder.png",
      receiptDate: null,
      totalAmount: null,
    });
    renderWithRouter(<ReceiptRow receipt={receipt} currency="USD" />);
    expect(
      screen.getByRole("heading", { name: "Unknown merchant" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("builder.png")).toBeNull();
    expect(screen.queryByText("$0.00")).toBeNull();
  },
);
it("keeps a known merchant and displays a known zero total", () => {
  renderWithRouter(
    <ReceiptRow
      receipt={buildReceiptDetail({ merchantName: "Market", totalAmount: "0" })}
      currency="USD"
    />,
  );
  expect(screen.getByRole("heading", { name: "Market" })).toBeInTheDocument();
  expect(screen.getByText("$0.00")).toBeInTheDocument();
});
