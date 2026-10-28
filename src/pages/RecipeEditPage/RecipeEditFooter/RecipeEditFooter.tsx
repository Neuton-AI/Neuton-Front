import { IconTrash } from '@/components/icons';
import { Button } from '@/components/ui';
import type { RecipeEditPageModel } from '../RecipeEditPage.module';

export function RecipeEditFooter({ model }: { model: RecipeEditPageModel }) {
  return (
    <footer className="flex shrink-0 gap-3 border-t border-hairline px-4 pb-[max(var(--safe-bottom),20px)] pt-3">
      <Button
        variant="outline"
        radius="input"
        aria-label="Delete recipe"
        disabled={model.busy}
        onClick={() => void model.remove()}
        className="h-12 w-12 shrink-0 p-0 text-semantic-error"
      >
        <IconTrash className="h-5 w-5" />
      </Button>
      <Button type="submit" radius="input" disabled={model.busy} loading={model.saving} className="h-12 flex-1 text-sm">
        Save changes
      </Button>
    </footer>
  );
}
