# Saved order details

Order detail uses the saved delivery fee, including an explicit zero, for both the total summary and delivery section. It does not reconstruct charges from distance or current shop defaults/rates. Legacy distance data remains available in the compatibility contract until T17, but is not presented as a current charge.

A known delivery date is formatted as a calendar date through the existing date-only formatter. Missing/null legacy dates are not replaced with the order date or today's date. Saved item names, quantities, prices and total amounts remain the source for line presentation; current recipe price/name/availability and current shop fee defaults cannot rewrite them.

Only a saved `costComplete === false` marks a line as partial. Those lines show “Partial cost”, the cost total is labelled “Known production cost”, and the detail explains that incomplete-cost items contribute no profit. Complete and historically unknown/null provenance are not inferred as partial or complete from their price. Profit and margin use the server's saved-order result; this page does not recalculate profit from known partial costs or current recipes.

Owners and admins can open the shared order form from a processing order. The form starts from the saved details, keeps the new-order draft separate, and requires a connection to load and save an edit. Saved lines keep their original price and cost when quantities change. Newly added lines use current reviewed pricing. A save checks the order version and returns to the same order with its invoice number and attachments intact.
