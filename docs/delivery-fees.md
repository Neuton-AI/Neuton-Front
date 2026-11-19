# Shop delivery settings

Owners and admins edit **Default delivery fee** in Profile → Shop. The value is a starting fee for new orders, not a minimum. Zero is valid. The control accepts cent amounts between 0 and 100,000. Members can view the value but cannot edit it.

The setting continues to use `deliveryBaseFee` through GET/PATCH `/shop`. Settings writes omit `deliveryRatePerKm`, preserving its legacy stored value. Store address remains editable without a distance-calculation claim. Existing error, retry and pending-save handling apply.

The layout follows Paper **Profile / Shop**, retaining the existing form controls, spacing, typography and colors. The approved delivery-fees specification supersedes that reference's old rate-engine controls and distance copy.

This settings slice does not switch New Order quoting or retire legacy APIs. Those changes belong to T06/T17 of Neuton-AI/Neuton-Back#268. Reverting this UI restores the previous controls; stored fee and legacy rate values remain intact.
