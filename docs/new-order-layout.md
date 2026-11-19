# New Order layout

The base layout follows Paper's `New Order / Edit-order counter variation`
(`4UU-0` in file `01M7QVXYX5KHRH38RKS2JY2SR4`). The browser omits the
reference's native status bar and uses native date inputs, whose displayed
calendar format follows the browser locale.

The screen uses the existing canvas, card, hairline and brand tokens, 16px
content insets, 42px inputs, a 112px final-fee control, and 88×44 counters.
Equal flexible columns on either side keep every counter at the shell center.
Names truncate visually while retaining their full accessible text and title.
The item total and remove button remain in the right column. The 48px Save
button sits in a sticky footer with bottom safe-area clearance; the content
remains scrollable and focusable controls reserve clearance above that footer.

The fee initializes from the loaded shop once. Refetching shop settings does not
replace an edited draft fee. Order and delivery dates initially match and then
remain independently editable. Delivery dates remain date-only; existing shop
timezone conversion applies to order dates.

X leaves a pristine draft immediately. Form edits or selected items require a
discard confirmation. Cancel and Escape retain the draft and restore focus to
X; confirmation clears selections and returns to Orders. The background is
inert while the confirmation owns focus. The confirmation belongs to its account
and shop scope. Refresh starts a fresh in-memory draft.

Add item opens the searchable overlay from Paper's `4PU-0` artboard. It
filters the current shop's eligible local catalog by name and reuses the catalog
preview and fallback. Selecting adds one unit and returns focus to Add item.
Use the arrow keys to highlight a recipe, Enter to add it, or Escape to dismiss.
The list scrolls within the visual viewport and opens above the button when
there is more room there. Zero and partial prices remain selectable.

Verification includes real HTTP smoke tests for ordinary order creation,
component tests for line controls and discard behavior, initialization/refetch
tests, and timezone-boundary tests. Chrome visual checks use the production
page with fixture authentication, a seeded local IndexedDB catalog, real fonts
and local totals. These browser checks do not verify production authentication
or a deployed backend. The Paper sample dates differ from the fixture's current
shop date; date independence is covered by automated tests.
