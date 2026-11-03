import { StoryBar } from '@/components/StoryBar';

export function StoriesPage() {
  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <h1 className="text-lg font-black text-ink">ستۆری کۆمەڵگە</h1>
        <p className="mt-1 text-xs leading-6 text-muted">
          ستۆری تۆ و هاوڕێکانت. ڕۆخەکانی ستۆری دەکرێتەوە بۆ چەند چرەژێک.
        </p>
      </div>
      <StoryBar />
    </div>
  );
}
