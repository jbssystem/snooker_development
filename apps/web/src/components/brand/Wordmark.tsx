import Image from 'next/image';

type WordmarkProps = {
  label: string;
  className?: string;
};

/**
 * Product wordmark: the app icon next to the product name, scaling cleanly at
 * any size.
 */
export function Wordmark({ label, className }: WordmarkProps) {
  return (
    <div className={className} role="img" aria-label={label}>
      <div className="flex items-center gap-3">
        <Image
          src="/icon-192.png"
          alt=""
          aria-hidden
          width={48}
          height={48}
          priority
          className="h-12 w-12 shrink-0 select-none rounded-xl"
        />
        <span className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="text-text-primary">Snooker </span>
          <span className="text-gradient">Player OS</span>
        </span>
      </div>
    </div>
  );
}
